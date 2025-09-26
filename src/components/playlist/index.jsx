import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import YouTube from "react-youtube";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Slider,
  List,
  ListItem,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import { ThemeProvider, createTheme, lighten } from "@mui/material/styles";
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeOff,
  MusicNote,
} from "@mui/icons-material";
import { lightBlue } from "@mui/material/colors";

// Create a dark theme with purple accents
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#9c27b0",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(30, 30, 30, 0.8)",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "rgba(40, 40, 40, 0.9)",
            transform: "translateY(-4px)",
            boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
          },
        },
      },
    },
  },
});

// Music Wave Animation Component
const MusicWave = ({ isPlaying }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        height: "40px",
        gap: "3px",
        my: 1,
      }}
    >
      {[...Array(12)].map((_, i) => (
        <Box
          key={i}
          sx={{
            width: "4px",
            height: isPlaying
              ? `${Math.floor(Math.random() * 30) + 5}px`
              : "5px",
            backgroundColor: "primary.main",
            borderRadius: "2px",
            transition: "height 0.2s ease",
            animation: isPlaying
              ? `waveAnimation ${(i % 4) + 0.5}s ease-in-out infinite alternate`
              : "none",
            "@keyframes waveAnimation": {
              "0%": {
                height: "5px",
              },
              "100%": {
                height: `${Math.floor(Math.random() * 30) + 10}px`,
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

export default function PlaylistPlayer() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [player, setPlayer] = useState(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);
  const timerRef = useRef(null);

  // YouTube API configuration
  const API_KEY =
    import.meta.env.REACT_APP_YOUTUBE_API_KEY ||
    "AIzaSyBd_ZaEX4umAPwzAwNklQ0iX9HibwGh7fQ";
  const PLAYLIST_IDS = [
    "PLFk8yBS-6-GybHSizBNGbhd4wu-rFB-f0",
    "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
    "PLHuHXHyLu7BGi-vR7X6j_xh_Tt9wy7pNA",
  ];

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
      setProgress((currentSeconds / totalSeconds) * 100);
    }
  };

  // Start/stop timer for tracking playback time
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(updateTime, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, player]);

  // Seek to position when user drags the progress bar
  const handleSeek = (event, newValue) => {
    if (player && duration) {
      const seekToSeconds = (newValue * duration) / 100;
      player.seekTo(seekToSeconds);
      setProgress(newValue);
      setCurrentTime(seekToSeconds);
    }
  };

  // Fetch multiple YouTube playlists and durations
  useEffect(() => {
    const fetchYouTubePlaylists = async () => {
      try {
        setLoading(true);
        let allItems = [];
        const playlistTitles = {};

        // Fetch items for each playlist
        for (const playlistId of PLAYLIST_IDS) {
          let nextPageToken = "";
          try {
            // First get playlist title
            const playlistResponse = await axios.get(
              "https://www.googleapis.com/youtube/v3/playlists",
              {
                params: {
                  part: "snippet",
                  id: playlistId,
                  key: API_KEY,
                },
              }
            );

            if (
              playlistResponse.data.items &&
              playlistResponse.data.items.length > 0
            ) {
              playlistTitles[playlistId] =
                playlistResponse.data.items[0].snippet.title;
            }

            do {
              const response = await axios.get(
                "https://www.googleapis.com/youtube/v3/playlistItems",
                {
                  params: {
                    part: "snippet,contentDetails",
                    playlistId,
                    key: API_KEY,
                    maxResults: 50,
                    pageToken: nextPageToken || undefined,
                  },
                }
              );

              allItems = allItems.concat(response.data.items);
              nextPageToken = response.data.nextPageToken;
            } while (nextPageToken);
          } catch (playlistErr) {
            console.warn(
              `Failed to fetch playlist ${playlistId}:`,
              playlistErr.response?.data || playlistErr.message
            );
          }
        }

        if (allItems.length === 0) {
          throw new Error("No items found in any playlist.");
        }

        // Fetch video durations
        const videoIds = allItems.map(
          (item) => item.snippet.resourceId.videoId
        );
        let durations = new Array(allItems.length).fill("N/A");

        if (videoIds.length > 0) {
          try {
            // Create a map to store video ID to index mapping
            const videoIdToIndexMap = new Map();
            videoIds.forEach((id, index) => {
              videoIdToIndexMap.set(id, index);
            });

            // Chunk video IDs into batches of 50 (YouTube API limit)
            const chunkSize = 50;
            const videoIdChunks = [];

            for (let i = 0; i < videoIds.length; i += chunkSize) {
              videoIdChunks.push(videoIds.slice(i, i + chunkSize));
            }

            // Fetch durations for each chunk
            const durationMap = new Map();

            await Promise.all(
              videoIdChunks.map(async (chunk) => {
                const chunkIds = chunk.join(",");
                const videoResponse = await axios.get(
                  "https://www.googleapis.com/youtube/v3/videos",
                  {
                    params: {
                      part: "contentDetails",
                      id: chunkIds,
                      key: API_KEY,
                    },
                  }
                );

                // Process the response for this chunk
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
                    ? `${hours}:${minutes
                        .toString()
                        .padStart(2, "0")}:${seconds}`
                    : `${minutes}:${seconds}`;
                  durationMap.set(item.id, formatted);
                });
              })
            );

            // Map durations back to the original order
            durations = videoIds.map((id) => durationMap.get(id) || "N/A");
          } catch (durationErr) {
            console.warn(
              "Failed to fetch durations:",
              durationErr.response?.data || durationErr.message
            );
          }
        }

        // Transform YouTube data into song format
        const playlistItems = allItems.map((item, index) => ({
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
        setActivePlaylist(PLAYLIST_IDS[0]);
        setLoading(false);
      } catch (err) {
        setError(
          "Failed to load playlists. Please check your API key or playlist IDs."
        );
        setLoading(false);
        console.error(
          "Error fetching playlists:",
          err.response ? err.response.data : err.message
        );
      }
    };

    fetchYouTubePlaylists();
  }, []);

  // Handle song selection
  const handleSongClick = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
    // The player will autoplay when the video loads due to the autoplay: 1 setting
  };

  // Player control handlers
  const handlePlayPause = () => {
    if (currentSong && player) {
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
      if (newValue === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
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

  const filterSongsByPlaylist = (playlistId) => {
    if (!playlistId) return songs;
    return songs.filter((song) => song.playlistId === playlistId);
  };

  // YouTube player handlers
  const onPlayerReady = (event) => {
    setPlayer(event.target);
    playerRef.current = event.target;
    event.target.setVolume(volume);
    if (isPlaying) {
      event.target.playVideo();
    }
    // Initialize duration
    setDuration(event.target.getDuration() || 0);
  };

  const onPlayerStateChange = (event) => {
    // Update playing state based on YouTube player state
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true);
      // Update duration when the video starts playing
      setDuration(player.getDuration() || 0);
    } else if (
      event.data === YouTube.PlayerState.PAUSED ||
      event.data === YouTube.PlayerState.ENDED
    ) {
      setIsPlaying(false);
    }

    // Auto play next song when current song ends
    if (event.data === YouTube.PlayerState.ENDED) {
      handleNext();
    }
  };

  // This effect ensures that when currentSong changes, the player loads and plays the new song
  useEffect(() => {
    if (player && currentSong) {
      player.loadVideoById(currentSong.videoId);
      setIsPlaying(true);
      setCurrentTime(0);
      setProgress(0);
    }
  }, [currentSong]);

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1, // Set to 1 to autoplay when song changes
      controls: 0,
    },
  };

  const filteredSongs = filterSongsByPlaylist(activePlaylist);

  return (
    <ThemeProvider theme={darkTheme}>
      <Paper
        elevation={3}
        sx={{
          width: "80vw",
          Width: "1400px",
          height: "90vh",
          mx: "auto",
          overflow: "hidden",
          borderRadius: 4,
          background: "transparent",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            height: "100%",
          }}
        >
          {/* Sidebar with playlists */}
          <Box
            sx={{
              width: { xs: "100%", md: "280px" },
              bgcolor: "transparent",
              p: 2,
              borderRight: { xs: 0, md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "transparent",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <MusicNote sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Playlists
              </Typography>
            </Box>

            <List disablePadding>
              {PLAYLIST_IDS.map((id) => (
                <ListItem
                  key={id}
                  button
                  onClick={() => setActivePlaylist(id)}
                  selected={activePlaylist === id}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      bgcolor: "primary.dark",
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={id.substring(0, 15) + "..."}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: "0.875rem",
                    }}
                  />
                </ListItem>
              ))}
            </List>

            {/* Now Playing Section */}
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                NOW PLAYING
              </Typography>
              {currentSong ? (
                <Card
                  sx={{
                    bgcolor: "rgba(40, 40, 40, 0.7)",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <CardMedia
                    component="img"
                    image={currentSong.thumbnail || "/placeholder.svg"}
                    alt={currentSong.title}
                    sx={{ aspectRatio: "16/9", objectFit: "cover" }}
                  />
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="body2" noWrap>
                      {currentSong.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {currentSong.artist}
                    </Typography>

                    {/* Music Wave Animation */}
                    <MusicWave isPlaying={isPlaying} />

                    {/* Progress Bar */}
                    <Slider
                      value={progress}
                      onChange={handleSeek}
                      aria-label="song progress"
                      size="small"
                      sx={{
                        mt: 1,
                        mb: 0.5,
                        height: 4,
                        "& .MuiSlider-thumb": {
                          width: 8,
                          height: 8,
                          transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
                          "&:before": {
                            boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
                          },
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: `0px 0px 0px 8px ${
                              darkTheme.palette.mode === "dark"
                                ? "rgb(156 39 176 / 16%)"
                                : "rgb(156 39 176 / 16%)"
                            }`,
                          },
                          "&.Mui-active": {
                            width: 12,
                            height: 12,
                          },
                        },
                        "& .MuiSlider-rail": {
                          opacity: 0.28,
                        },
                      }}
                    />

                    {/* Time Display */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(currentTime)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(duration)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Box
                  sx={{
                    bgcolor: "rgba(30, 30, 30, 0.5)",
                    borderRadius: 1,
                    p: 2,
                    textAlign: "center",
                    color: "text.disabled",
                  }}
                >
                  <Typography variant="body2">No song selected</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Main content */}
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h5" fontWeight="bold">
                Music Library
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredSongs.length} songs available
              </Typography>
            </Box>

            {/* Song list */}
            <Box
              sx={{
                flexGrow: 1,
                p: 3,
                overflowY: "auto",
                maxHeight: { xs: "50vh", md: "65vh" },
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
                    height: "100%",
                    py: 8,
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
                  {filteredSongs.map((song) => (
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
                                currentSong?.id === song.id && isPlaying
                                  ? 1
                                  : 0,
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

                          {/* Add music wave animation for currently playing song */}
                          {currentSong?.id === song.id && isPlaying && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: "30px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-end",
                                background:
                                  "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
                                padding: "0 8px",
                              }}
                            >
                              <MusicWave isPlaying={isPlaying} />
                            </Box>
                          )}
                        </Box>
                        <CardContent>
                          <Typography variant="body2" noWrap>
                            {song.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
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

            {/* Player controls */}
            <Box
              sx={{
                p: 3,
                borderTop: 1,
                borderColor: ")rgba(255,255,255,0.1",
                bgcolor: "transparent",
              }}
            >
              {/* Progress bar for main player */}
              {currentSong && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: "transparent",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 2,
                        background:
                          "linear-gradient(90deg, #9c27b0 0%, #f50057 100%)",
                      },
                    }}
                  />
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(currentTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(duration)}
                    </Typography>
                  </Box>
                </Box>
              )}

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
            </Box>
          </Box>
        </Box>

        {/* Hidden YouTube player */}
        {currentSong && (
          <YouTube
            videoId={currentSong.videoId}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            style={{ display: "none" }}
          />
        )}
      </Paper>
    </ThemeProvider>
  );
}
