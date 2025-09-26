import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Slider,
  LinearProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeOff,
} from "@mui/icons-material";
import axios from "axios";
import YouTube from "react-youtube";

const SearchComponent = () => {
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isYouTubeApiLoaded, setIsYouTubeApiLoaded] = useState(false); // Track API loading
  const playerRef = useRef(null);
  const timerRef = useRef(null);

  const API_KEY =
    import.meta.env.REACT_APP_YOUTUBE_API_KEY ||
    "AIzaSyBd_ZaEX4umAPwzAwNklQ0iX9HibwGh7fQ";
  const DEFAULT_PLAYLIST_ID = "PLFk8yBS-6-GybHSizBNGbhd4wu-rFB-f0";

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Set global callback for when the API is loaded
      window.onYouTubeIframeAPIReady = () => {
        setIsYouTubeApiLoaded(true);
      };
    } else {
      setIsYouTubeApiLoaded(true);
    }

    return () => {
      // Clean up the global callback
      delete window.onYouTubeIframeAPIReady;
    };
  }, []);

  // Format time in MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Update current time
  const updateTime = () => {
    if (player && isPlaying) {
      const currentSeconds = player.getCurrentTime() || 0;
      const totalSeconds = player.getDuration() || 0;
      setCurrentTime(currentSeconds);
      setDuration(totalSeconds);
      setProgress(totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : 0);
    }
  };

  // Start/stop timer for tracking playback time
  useEffect(() => {
    if (isPlaying && player) {
      timerRef.current = setInterval(updateTime, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, player]);

  // Handle seek on progress bar
  const handleSeek = (event, newValue) => {
    if (player && duration) {
      const seekToSeconds = (newValue * duration) / 100;
      player.seekTo(seekToSeconds);
      setProgress(newValue);
      setCurrentTime(seekToSeconds);
    }
  };

  // Fetch default songs
  useEffect(() => {
    const fetchDefaultSongs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "https://www.googleapis.com/youtube/v3/playlistItems",
          {
            params: {
              part: "snippet,contentDetails",
              playlistId: DEFAULT_PLAYLIST_ID,
              key: API_KEY,
              maxResults: 20,
            },
          }
        );

        const videoIds = response.data.items.map(
          (item) => item.snippet.resourceId.videoId
        );
        let durations = new Array(videoIds.length).fill("N/A");

        if (videoIds.length > 0) {
          try {
            const videoResponse = await axios.get(
              "https://www.googleapis.com/youtube/v3/videos",
              {
                params: {
                  part: "contentDetails",
                  id: videoIds.join(","),
                  key: API_KEY,
                },
              }
            );

            const durationMap = new Map();
            videoResponse.data.items.forEach((item) => {
              const duration = item.contentDetails.duration;
              const match = duration.match(
                /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
              );
              const hours = match[1] ? Number.parseInt(match[1]) : 0;
              const minutes = match[2] ? Number.parseInt(match[2]) : 0;
              const seconds = match[3]
                ? Number.parseInt(match[3]).toString().padStart(2, "0")
                : "00";
              const formatted = hours
                ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`
                : `${minutes}:${seconds}`;
              durationMap.set(item.id, formatted);
            });

            durations = videoIds.map((id) => durationMap.get(id) || "N/A");
          } catch (durationErr) {
            console.warn("Failed to fetch durations:", durationErr.message);
          }
        }

        const playlistItems = response.data.items.map((item, index) => ({
          id: index + 1,
          title: item.snippet.title,
          artist: item.snippet.videoOwnerChannelTitle || "Unknown Artist",
          duration: durations[index] || "N/A",
          videoId: item.snippet.resourceId.videoId,
          thumbnail:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            "",
          playlistId: item.snippet.playlistId,
        }));

        setSongs(playlistItems);
        setLoading(false);
      } catch (err) {
        setError("Failed to load default songs. Please try again.");
        setLoading(false);
        console.error("Error fetching default songs:", err.message);
      }
    };

    fetchDefaultSongs();
  }, []);

  // Handle search query
  const handleSearch = async (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      const fetchDefaultSongs = async () => {
        try {
          setLoading(true);
          const response = await axios.get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            {
              params: {
                part: "snippet,contentDetails",
                playlistId: DEFAULT_PLAYLIST_ID,
                key: API_KEY,
                maxResults: 20,
              },
            }
          );

          const videoIds = response.data.items.map(
            (item) => item.snippet.resourceId.videoId
          );
          let durations = new Array(videoIds.length).fill("N/A");

          if (videoIds.length > 0) {
            const videoResponse = await axios.get(
              "https://www.googleapis.com/youtube/v3/videos",
              {
                params: {
                  part: "contentDetails",
                  id: videoIds.join(","),
                  key: API_KEY,
                },
              }
            );

            const durationMap = new Map();
            videoResponse.data.items.forEach((item) => {
              const duration = item.contentDetails.duration;
              const match = duration.match(
                /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
              );
              const hours = match[1] ? Number.parseInt(match[1]) : 0;
              const minutes = match[2] ? Number.parseInt(match[2]) : 0;
              const seconds = match[3]
                ? Number.parseInt(match[3]).toString().padStart(2, "0")
                : "00";
              const formatted = hours
                ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`
                : `${minutes}:${seconds}`;
              durationMap.set(item.id, formatted);
            });

            durations = videoIds.map((id) => durationMap.get(id) || "N/A");
          }

          const playlistItems = response.data.items.map((item, index) => ({
            id: index + 1,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || "Unknown Artist",
            duration: durations[index] || "N/A",
            videoId: item.snippet.resourceId.videoId,
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url ||
              "",
            playlistId: item.snippet.playlistId,
          }));

          setSongs(playlistItems);
          setLoading(false);
        } catch (err) {
          setError("Failed to load default songs. Please try again.");
          setLoading(false);
        }
      };
      fetchDefaultSongs();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: query + " song",
            type: "video",
            key: API_KEY,
            maxResults: 20,
            videoCategoryId: "10",
          },
        }
      );

      const videoIds = response.data.items.map((item) => item.id.videoId);
      let durations = new Array(videoIds.length).fill("N/A");

      if (videoIds.length > 0) {
        try {
          const videoResponse = await axios.get(
            "https://www.googleapis.com/youtube/v3/videos",
            {
              params: {
                part: "contentDetails",
                id: videoIds.join(","),
                key: API_KEY,
              },
            }
          );

          const durationMap = new Map();
          videoResponse.data.items.forEach((item) => {
            const duration = item.contentDetails.duration;
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const hours = match[1] ? Number.parseInt(match[1]) : 0;
            const minutes = match[2] ? Number.parseInt(match[2]) : 0;
            const seconds = match[3]
              ? Number.parseInt(match[3]).toString().padStart(2, "0")
              : "00";
            const formatted = hours
              ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`
              : `${minutes}:${seconds}`;
            durationMap.set(item.id, formatted);
          });

          durations = videoIds.map((id) => durationMap.get(id) || "N/A");
        } catch (durationErr) {
          console.warn("Failed to fetch durations:", durationErr.message);
        }
      }

      const searchItems = response.data.items.map((item, index) => ({
        id: index + 1,
        title: item.snippet.title,
        artist: item.snippet.channelTitle || "Unknown Artist",
        duration: durations[index] || "N/A",
        videoId: item.id.videoId,
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
        playlistId: null,
      }));

      setSongs(searchItems);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch search results. Please try again.");
      setLoading(false);
      console.error("Error fetching search results:", err.message);
    }
  };

  // Handle song selection
  const handleSongClick = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  // Player control handlers
  const handlePlayPause = () => {
    if (player && currentSong) {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((song) => song.id === currentSong?.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const handlePrevious = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((song) => song.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (player) {
      player.setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
        player.setVolume(volume);
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  // YouTube player handlers
  const onPlayerReady = (event) => {
    setPlayer(event.target);
    playerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying && currentSong) {
      event.target.loadVideoById(currentSong.videoId);
    }
    setDuration(event.target.getDuration() || 0);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      setDuration(event.target.getDuration() || 0);
    } else if (
      event.data === YouTube.PlayerState.PAUSED ||
      event.data === YouTube.PlayerState.ENDED
    ) {
      setIsPlaying(false);
    }
    if (event.data === YouTube.PlayerState.ENDED) {
      handleNext();
    }
  };

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0, // Set to 0 to prevent automatic playback until ready
      controls: 0,
    },
  };

  return (
    <Box
      sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Search Input */}
      <TextField
        style={{ width: "30%", alignSelf: "cente" }}
        fullWidth
        variant="outlined"
        placeholder="Search songs or artists..."
        value={searchQuery}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "white" }} />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 28,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "primary.main",
            },
            "& .MuiInputBase-input": {
              color: "white",
              py: 1.5,
            },
          },
        }}
        sx={{ mb: 3 }}
      />

      {/* Song List */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          maxHeight: "65vh",
          "&::-webkit-scrollbar": {
            width: "10px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(0,0,0,0.2)",
            borderRadius: "5px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(156, 39, 176, 0.4)",
            borderRadius: "5px",
            "&:hover": {
              background: "rgba(156, 39, 176, 0.6)",
            },
          },
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <CircularProgress color="primary" />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {songs.map((song) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={song.id}>
                <Card
                  onClick={() => handleSongClick(song)}
                  sx={{
                    cursor: "pointer",
                    position: "relative",
                    height: "215px",
                    width: "210px",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 20px rgba(0,0,0,0.4)",
                    },
                    ...(currentSong?.id === song.id && {
                      border: "2px solid",
                      borderColor: "primary.main",
                      boxShadow: "0 0 15px rgba(156, 39, 176, 0.6)",
                    }),
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={song.thumbnail || "/placeholder.svg"}
                      alt={`${song.title} thumbnail`}
                      sx={{
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity:
                          currentSong?.id === song.id && isPlaying ? 1 : 0,
                        transition: "opacity 0.2s",
                        "&:hover": {
                          opacity: 1,
                        },
                      }}
                    >
                      <IconButton
                        size="large"
                        sx={{
                          bgcolor: "primary.main",
                          color: "white",
                          "&:hover": {
                            bgcolor: "primary.dark",
                            transform: "scale(1.1)",
                          },
                          transition: "transform 0.2s",
                        }}
                      >
                        {currentSong?.id === song.id && isPlaying ? (
                          <Pause fontSize="large" />
                        ) : (
                          <PlayArrow fontSize="large" />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {song.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {song.artist}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        {song.duration}
                      </Typography>
                      {currentSong?.id === song.id && (
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 10,
                            bgcolor: "primary.dark",
                            color: "primary.contrastText",
                            fontSize: "0.675rem",
                          }}
                        >
                          Now Playing
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Player Controls */}
      <Box
        sx={{
          p: 3,
          borderTop: 1,
          borderColor: "rgba(255,255,255,0.1)",
          bgcolor: "transparent",
        }}
      >
        {currentSong && (
          <>
            <Box sx={{ mb: 2 }}>
              <Slider
                value={progress}
                onChange={handleSeek}
                min={0}
                max={100}
                size="small"
                sx={{
                  height: 4,
                  borderRadius: 2,
                  mb: 1,
                  "& .MuiSlider-rail": {
                    background: "rgba(255,255,255,0.1)",
                  },
                  "& .MuiSlider-track": {
                    background:
                      "linear-gradient(90deg, #9c27b0 0%, #f50057 100%)",
                  },
                  "& .MuiSlider-thumb": {
                    width: 12,
                    height: 12,
                  },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(currentTime)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(duration)}
                </Typography>
              </Box>
              <Box sx={{ mt: 1, textAlign: "center" }}>
                <Typography variant="body2" noWrap>
                  {currentSong.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {currentSong.artist}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  onClick={handlePrevious}
                  disabled={!currentSong}
                  color="inherit"
                >
                  <SkipPrevious />
                </IconButton>
                <Button
                  variant="contained"
                  color={isPlaying ? "primary" : "secondary"}
                  onClick={handlePlayPause}
                  disabled={!currentSong}
                  sx={{
                    mx: 1.5,
                    minWidth: "56px",
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  }}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </Button>
                <IconButton
                  onClick={handleNext}
                  disabled={!currentSong}
                  color="inherit"
                >
                  <SkipNext />
                </IconButton>
              </Box>

              <Box
                sx={{ display: "flex", alignItems: "center", width: "140px" }}
              >
                <IconButton onClick={toggleMute} size="small">
                  {isMuted ? (
                    <VolumeOff fontSize="small" />
                  ) : (
                    <VolumeUp fontSize="small" />
                  )}
                </IconButton>
                <Slider
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  min={0}
                  max={100}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Hidden YouTube Player */}
      {isYouTubeApiLoaded && currentSong && (
        <YouTube
          videoId={currentSong.videoId}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          style={{ display: "none" }}
        />
      )}
    </Box>
  );
};

export default SearchComponent;
