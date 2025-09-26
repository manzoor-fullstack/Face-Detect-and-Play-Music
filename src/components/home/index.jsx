import React, { useState, useRef, useEffect } from "react";
import Webcam from "../../WebCam";
import EmotionDetector from "../../EmotionDetector";
import YouTube from "react-youtube";
import axios from "axios";
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
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeOff,
  MusicNote,
  Videocam,
  Refresh,
  SentimentSatisfiedAlt,
  YouTube as YouTubeIcon,
  Headphones,
} from "@mui/icons-material";

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
  typography: {
    h5: {
      fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
    },
    h6: {
      fontSize: { xs: "1rem", sm: "1.25rem" },
    },
    subtitle2: {
      fontSize: { xs: "0.75rem", sm: "0.875rem" },
    },
    body2: {
      fontSize: { xs: "0.75rem", sm: "0.875rem" },
    },
    caption: {
      fontSize: { xs: "0.65rem", sm: "0.75rem" },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          padding: { xs: "6px 12px", sm: "8px 16px" },
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
        height: { xs: "30px", sm: "40px" },
        gap: { xs: "2px", sm: "3px" },
        my: 1,
      }}
    >
      {[...Array(12)].map((_, i) => (
        <Box
          key={i}
          sx={{
            width: { xs: "3px", sm: "4px" },
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

// Define getEmotionColor before Home
const getEmotionColor = (emotion) => {
  const emotionColors = {
    Happy: "#FFD700", // Gold
    Sad: "#4169E1", // Royal Blue
    Angry: "#FF4500", // Red Orange
    Surprised: "#9932CC", // Dark Orchid
    Neutral: "#9c27b0", // Default Purple
    Fearful: "#2E8B57", // Sea Green
    Disgusted: "#8B4513", // Saddle Brown
  };
  return emotionColors[emotion] || "#9c27b0";
};

function Home() {
  const [emotion, setEmotion] = useState("Neutral");
  const [capturedEmotion, setCapturedEmotion] = useState(null);
  const [playMusic, setPlayMusic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [player, setPlayer] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const API_KEY =
    import.meta.env.REACT_APP_YOUTUBE_API_KEY ||
    "AIzaSyBd_ZaEX4umAPwzAwNklQ0iX9HibwGh7fQ";

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateTime = () => {
    if (player && isPlaying) {
      const currentSeconds = player.getCurrentTime() || 0;
      const totalSeconds = player.getDuration() || 0;
      setCurrentTime(currentSeconds);
      setDuration(totalSeconds);
      setProgress(totalSeconds ? (currentSeconds / totalSeconds) * 100 : 0);
    }
  };

  useEffect(() => {
    if (isPlaying && player) {
      timerRef.current = setInterval(updateTime, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, player]);

  const handleSeek = (event, newValue) => {
    if (player && duration) {
      const seekToSeconds = (newValue * duration) / 100;
      player.seekTo(seekToSeconds);
      setProgress(newValue);
      setCurrentTime(seekToSeconds);
    }
  };

  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      setCapturedEmotion(emotion);
      setPlayMusic(true);
      setIsWebcamActive(false);

      await fetchYouTubeAudioTracks(emotion);
    }
  };

  const fetchYouTubeAudioTracks = async (emotion) => {
    setLoading(true);
    setError(null);
    try {
      if (!API_KEY) {
        throw new Error(
          "YouTube API key is missing. Please add a valid key in your .env.local file as NEXT_PUBLIC_YOUTUBE_API_KEY. See https://developers.google.com/youtube/v3/getting-started for instructions."
        );
      }
      const searchQuery = getSearchQueryForEmotion(emotion) + " audio";
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            maxResults: 12,
            q: searchQuery,
            type: "video",
            videoCategoryId: "10",
            videoDefinition: "high",
            key: API_KEY,
          },
        }
      );

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error("No audio tracks found for this emotion.");
      }

      const videoIds = response.data.items
        .map((item) => item.id.videoId)
        .join(",");

      const videoDetailsResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos",
        {
          params: {
            part: "contentDetails,statistics,snippet",
            id: videoIds,
            key: API_KEY,
          },
        }
      );

      const processedTracks = videoDetailsResponse.data.items.map(
        (item, index) => {
          const duration = item.contentDetails.duration;
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          const hours = match[1] ? Number.parseInt(match[1]) : 0;
          const minutes = match[2] ? Number.parseInt(match[2]) : 0;
          const seconds = match[3] ? Number.parseInt(match[3]) : 0;
          const formattedDuration =
            hours > 0
              ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                  .toString()
                  .padStart(2, "0")}`
              : `${minutes}:${seconds.toString().padStart(2, "0")}`;

          return {
            id: index.toString(),
            videoId: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            duration: formattedDuration,
            thumbnail:
              item.snippet.thumbnails.high.url ||
              item.snippet.thumbnails.medium.url ||
              item.snippet.thumbnails.default.url,
            viewCount: item.statistics.viewCount,
            isAudio: true,
          };
        }
      );

      setTracks(processedTracks);
      if (processedTracks.length > 0) {
        setCurrentTrack(processedTracks[0]);
      }
    } catch (error) {
      console.error("Error fetching YouTube audio tracks:", error);
      const errorMessage = error.message.includes("API key")
        ? error.message
        : "Failed to fetch tracks from YouTube. Using demo tracks. Ensure your API key is valid and has sufficient quota.";
      setError(errorMessage);
      const mockTracks = getMockTracksForEmotion(emotion);
      setTracks(mockTracks);
      if (mockTracks.length > 0) {
        setCurrentTrack(mockTracks[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getSearchQueryForEmotion = (emotion) => {
    const emotionQueries = {
      Happy: "happy upbeat music",
      Sad: "sad emotional music",
      Angry: "angry powerful music",
      Surprised: "surprising exciting music",
      Neutral: "relaxing ambient music",
      Fearful: "suspenseful music",
      Disgusted: "intense dark music",
    };
    return emotionQueries[emotion] || "relaxing music";
  };

  const getMockTracksForEmotion = (emotion) => {
    const emotionToMusicMap = {
      Happy: [
        {
          id: "1",
          videoId: "ZbZSe6N_BXs",
          title: "Happy - Pharrell Williams",
          artist: "Pharrell Williams",
          duration: "3:53",
          thumbnail: "https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg",
          viewCount: "1200000",
          isAudio: true,
        },
        {
          id: "2",
          videoId: "y6Sxv-sUYtM",
          title: "Can't Stop the Feeling! - Justin Timberlake",
          artist: "Justin Timberlake",
          duration: "3:56",
          thumbnail: "https://i.ytimg.com/vi/y6Sxv-sUYtM/hqdefault.jpg",
          viewCount: "900000",
          isAudio: true,
        },
      ],
      Sad: [
        {
          id: "3",
          videoId: "hLQl3WQQoQ0",
          title: "Someone Like You - Adele",
          artist: "Adele",
          duration: "4:45",
          thumbnail: "https://i.ytimg.com/vi/hLQl3WQQoQ0/hqdefault.jpg",
          viewCount: "1500000",
          isAudio: true,
        },
        {
          id: "4",
          videoId: "sad456",
          title: "My Heart Will Go On - Celine Dion",
          artist: "Celine Dion",
          duration: "4:40",
          thumbnail: "https://i.ytimg.com/vi/sad456/hqdefault.jpg",
          viewCount: "1100000",
          isAudio: true,
        },
      ],
      Angry: [
        {
          id: "5",
          videoId: "angry123",
          title: "Sweet Child O' Mine - Guns N' Roses",
          artist: "Guns N' Roses",
          duration: "5:56",
          thumbnail: "https://i.ytimg.com/vi/angry123/hqdefault.jpg",
          viewCount: "800000",
          isAudio: true,
        },
        {
          id: "6",
          videoId: "angry789",
          title: "Killing in the Name - Rage Against the Machine",
          artist: "Rage Against the Machine",
          duration: "5:14",
          thumbnail: "https://i.ytimg.com/vi/angry789/hqdefault.jpg",
          viewCount: "600000",
          isAudio: true,
        },
      ],
      Surprised: [
        {
          id: "7",
          videoId: "surprise123",
          title: "Bohemian Rhapsody - Queen",
          artist: "Queen",
          duration: "5:55",
          thumbnail: "https://i.ytimg.com/vi/surprise123/hqdefault.jpg",
          viewCount: "2000000",
          isAudio: true,
        },
        {
          id: "8",
          videoId: "surprise456",
          title: "Sweet Caroline - Neil Diamond",
          artist: "Neil Diamond",
          duration: "3:23",
          thumbnail: "https://i.ytimg.com/vi/surprise456/hqdefault.jpg",
          viewCount: "700000",
          isAudio: true,
        },
      ],
      Neutral: [
        {
          id: "9",
          videoId: "relaxing123",
          title: "Relaxing Ambient Music",
          artist: "Chill Vibes",
          duration: "5:00",
          thumbnail: "https://i.ytimg.com/vi/relaxing123/hqdefault.jpg",
          viewCount: "500000",
          isAudio: true,
        },
        {
          id: "10",
          videoId: "relaxing456",
          title: "Peaceful Piano Music",
          artist: "Relaxation Station",
          duration: "4:30",
          thumbnail: "https://i.ytimg.com/vi/relaxing456/hqdefault.jpg",
          viewCount: "400000",
          isAudio: true,
        },
      ],
      Fearful: [
        {
          id: "11",
          videoId: "fearful123",
          title: "Suspenseful Cinematic Music",
          artist: "Epic Soundtracks",
          duration: "4:20",
          thumbnail: "https://i.ytimg.com/vi/fearful123/hqdefault.jpg",
          viewCount: "300000",
          isAudio: true,
        },
        {
          id: "12",
          videoId: "fearful456",
          title: "Dark Suspense Music",
          artist: "Cinematic Tunes",
          duration: "3:50",
          thumbnail: "https://i.ytimg.com/vi/fearful456/hqdefault.jpg",
          viewCount: "250000",
          isAudio: true,
        },
      ],
      Disgusted: [
        {
          id: "13",
          videoId: "disgust123",
          title: "Dark Intense Music",
          artist: "Heavy Tunes",
          duration: "3:45",
          thumbnail: "https://i.ytimg.com/vi/disgust123/hqdefault.jpg",
          viewCount: "400000",
          isAudio: true,
        },
        {
          id: "14",
          videoId: "disgust456",
          title: "Grunge Industrial Music",
          artist: "Dark Beats",
          duration: "4:10",
          thumbnail: "https://i.ytimg.com/vi/disgust456/hqdefault.jpg",
          viewCount: "350000",
          isAudio: true,
        },
      ],
    };
    return emotionToMusicMap[emotion] || emotionToMusicMap["Neutral"];
  };

  const handleReset = () => {
    setCapturedEmotion(null);
    setPlayMusic(false);
    setTracks([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    setError(null);
    setIsWebcamActive(true);
    if (player) {
      try {
        player.pauseVideo();
      } catch (err) {
        console.error("Error pausing video:", err);
      }
    }
  };

  const handleTrackSelect = (track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const togglePlayPause = () => {
    if (player) {
      try {
        if (isPlaying) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch (err) {
        console.error("Error toggling play/pause:", err);
        setError("Failed to control playback. Please try again.");
      }
    }
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex(
      (track) => track.id === currentTrack?.id
    );
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentTrack(tracks[nextIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const handlePrevious = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex(
      (track) => track.id === currentTrack?.id
    );
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prevIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (player) {
      try {
        player.setVolume(newValue);
        if (newValue === 0) {
          setIsMuted(true);
        } else {
          setIsMuted(false);
        }
      } catch (err) {
        console.error("Error setting volume:", err);
      }
    }
  };

  const toggleMute = () => {
    if (player) {
      try {
        if (isMuted) {
          player.unMute();
          player.setVolume(volume);
          setIsMuted(false);
        } else {
          player.mute();
          setIsMuted(true);
        }
      } catch (err) {
        console.error("Error toggling mute:", err);
      }
    }
  };

  const onPlayerReady = (event) => {
    const playerInstance = event.target;
    setPlayer(playerInstance);
    try {
      playerInstance.setVolume(volume);
      if (currentTrack) {
        playerInstance.loadVideoById(currentTrack.videoId);
        setIsPlaying(true);
        setCurrentTime(0);
        setProgress(0);
      }
      setDuration(playerInstance.getDuration() || 0);
    } catch (err) {
      console.error("Error in onPlayerReady:", err);
      setError("Failed to initialize player. Please try again.");
    }
  };

  const onPlayerStateChange = (event) => {
    try {
      if (event.data === YouTube.PlayerState.PLAYING) {
        setIsPlaying(true);
        setDuration(player?.getDuration() || 0);
      } else if (
        event.data === YouTube.PlayerState.PAUSED ||
        event.data === YouTube.PlayerState.ENDED
      ) {
        setIsPlaying(false);
      }
      if (event.data === YouTube.PlayerState.ENDED) {
        handleNext();
      }
    } catch (err) {
      console.error("Error in onPlayerStateChange:", err);
    }
  };

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1,
      controls: 0,
    },
  };

  const formatViewCount = (count) => {
    if (!count) return "";
    const num = Number.parseInt(count);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M plays";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K plays";
    } else {
      return num + " plays";
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Paper
        elevation={3}
        sx={{
          width: { xs: "100vw", sm: "90vw", md: "80vw", lg: "78vw" },
          minHeight: "100vh",
          mx: "auto",
          overflow: "hidden",
          borderRadius: 0,
          background: "linear-gradient(to bottom, #121212, #1e1e1e)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            minHeight: "100vh",
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", md: "300px", lg: "320px" },
              bgcolor: "rgba(20, 20, 20, 0.8)",
              p: { xs: 1.5, sm: 2 },
              borderRight: { xs: 0, md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <MusicNote sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant="h6" fontWeight="bold">
                Emotion Music
              </Typography>
            </Box>

            <Paper
              elevation={3}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 3,
                bgcolor: "rgba(30, 30, 30, 0.7)",
                borderRadius: 2,
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                CURRENT EMOTION
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SentimentSatisfiedAlt
                  sx={{
                    mr: 1,
                    color: getEmotionColor(emotion),
                    fontSize: { xs: "1.5rem", sm: "2rem" },
                  }}
                />
                <Typography
                  variant="h5"
                  sx={{ color: getEmotionColor(emotion) }}
                >
                  {emotion}
                </Typography>
              </Box>
              {capturedEmotion && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mt: 2, mb: 1 }}
                  >
                    CAPTURED EMOTION
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <SentimentSatisfiedAlt
                      sx={{
                        mr: 1,
                        color: getEmotionColor(capturedEmotion),
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{ color: getEmotionColor(capturedEmotion) }}
                    >
                      {capturedEmotion}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                WEBCAM
              </Typography>
              <Paper
                elevation={3}
                sx={{
                  overflow: "hidden",
                  borderRadius: 2,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {isWebcamActive ? (
                  <Webcam
                    isActive={isWebcamActive}
                    onLoaded={(video, canvas) => {
                      videoRef.current = video.current;
                      canvasRef.current = canvas.current;
                      streamRef.current = video.current.srcObject;
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      aspectRatio: "16/9",
                      bgcolor: "black",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography color="text.secondary">
                      Webcam Stopped
                    </Typography>
                  </Box>
                )}
                {isWebcamActive && (
                  <EmotionDetector
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    onEmotionChange={setEmotion}
                    onError={(err) => console.error(err)}
                  />
                )}
              </Paper>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 3,
                px: { xs: 1, sm: 0 },
              }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<Videocam />}
                onClick={handleCapture}
                sx={{
                  py: { xs: 1, sm: 1.5 },
                  background:
                    "linear-gradient(45deg, #9c27b0 30%, #f50057 90%)",
                  boxShadow: "0 3px 5px 2px rgba(156, 39, 176, .3)",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
                disabled={loading}
              >
                {loading ? "Loading..." : "Capture & Play Music"}
              </Button>

              {playMusic && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                  sx={{
                    py: { xs: 1, sm: 1.5 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Reset
                </Button>
              )}
            </Box>

            {currentTrack && (
              <Box sx={{ mt: "auto" }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  NOW PLAYING
                </Typography>
                <Card
                  sx={{
                    bgcolor: "rgba(40, 40, 40, 0.7)",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    width: { xs: "100%", sm: "90%", md: "100%" },
                    mx: "auto",
                  }}
                >
                  <CardMedia
                    component="img"
                    image={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    sx={{ aspectRatio: "16/9", objectFit: "cover" }}
                  />
                  <CardContent sx={{ py: { xs: 1, sm: 1.5 } }}>
                    <Typography variant="body2" noWrap>
                      {currentTrack.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {currentTrack.artist}
                    </Typography>
                    <MusicWave isPlaying={isPlaying} />
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
                          width: { xs: 6, sm: 8 },
                          height: { xs: 6, sm: 8 },
                          transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
                          "&:before": {
                            boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
                          },
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: "0px 0px 0px 8px rgb(156 39 176 / 16%)",
                          },
                          "&.Mui-active": {
                            width: { xs: 10, sm: 12 },
                            height: { xs: 10, sm: 12 },
                          },
                        },
                        "& .MuiSlider-rail": {
                          opacity: 0.28,
                        },
                      }}
                    />
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
              </Box>
            )}
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              width: { xs: "100%", md: "auto" },
            }}
          >
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="h5" fontWeight="bold">
                  {capturedEmotion
                    ? `${capturedEmotion} Music`
                    : "Music Library"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                  <YouTubeIcon
                    sx={{ color: "#FF0000", fontSize: { xs: 20, sm: 24 } }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ ml: 0.5, color: "text.secondary" }}
                  >
                    Audio
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {tracks.length} tracks available
              </Typography>
            </Box>

            {loading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  py: { xs: 4, sm: 8 },
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            )}

            {error && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              </Box>
            )}

            <Box
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3 },
                overflowY: "auto",
                maxHeight: { xs: "40vh", sm: "50vh", md: "65vh" },
                "&::-webkit-scrollbar": {
                  width: { xs: "8px", sm: "10px" },
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
              {playMusic && tracks.length > 0 && (
                <Grid container spacing={{ xs: 1, sm: 2 }}>
                  {tracks.map((track) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={4}
                      lg={3}
                      key={track.id}
                      sx={{ display: "flex", justifyContent: "center" }}
                    >
                      <Card
                        onClick={() => handleTrackSelect(track)}
                        sx={{
                          cursor: "pointer",
                          position: "relative",
                          height: { xs: "180px", sm: "200px", md: "215px" },
                          width: { xs: "100px", sm: "180px", md: "190px" },
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-8px)",
                            boxShadow: "0 12px 20px rgba(0,0,0,0.4)",
                          },
                          ...(currentTrack?.id === track.id && {
                            border: "2px solid",
                            borderColor: "primary.main",
                            boxShadow: "0 0 15px rgba(156, 39, 176, 0.6)",
                          }),
                        }}
                      >
                        <Box sx={{ position: "relative", flexShrink: 0 }}>
                          <CardMedia
                            component="img"
                            image={track.thumbnail}
                            alt={`${track.title} thumbnail`}
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
                                currentTrack?.id === track.id && isPlaying
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
                              {currentTrack?.id === track.id && isPlaying ? (
                                <Pause fontSize="large" />
                              ) : (
                                <PlayArrow fontSize="large" />
                              )}
                            </IconButton>
                          </Box>
                          <Box
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              bgcolor: "rgba(0,0,0,0.7)",
                              borderRadius: "4px",
                              p: 0.5,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <YouTubeIcon
                              sx={{
                                fontSize: { xs: 14, sm: 16 },
                                color: "#FF0000",
                              }}
                            />
                            <Headphones
                              sx={{
                                fontSize: { xs: 12, sm: 14 },
                                ml: 0.5,
                                color: "#FFFFFF",
                              }}
                            />
                          </Box>
                          {currentTrack?.id === track.id && isPlaying && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: { xs: "25px", sm: "30px" },
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
                        <CardContent
                          sx={{ p: { xs: 1, sm: 1.5 }, flexGrow: 1 }}
                        >
                          <Typography variant="body2" noWrap>
                            {track.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {track.artist}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mt: { xs: 0.5, sm: 1 },
                            }}
                          >
                            <Typography variant="caption" color="text.disabled">
                              {track.duration}
                            </Typography>
                            {currentTrack?.id === track.id ? (
                              <Box
                                component="span"
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: 10,
                                  bgcolor: "primary.dark",
                                  color: "primary.contrastText",
                                  fontSize: { xs: "0.6rem", sm: "0.675rem" },
                                }}
                              >
                                Now Playing
                              </Box>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                {formatViewCount(track.viewCount)}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {!playMusic && !loading && !error && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: { xs: "40vh", sm: "50vh" },
                    textAlign: "center",
                    p: { xs: 2, sm: 3 },
                  }}
                >
                  <MusicNote
                    sx={{
                      fontSize: { xs: 40, sm: 60 },
                      color: "primary.main",
                      mb: 2,
                      opacity: 0.6,
                    }}
                  />
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    Capture Your Emotion to Start
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: { xs: "90%", sm: "70%" } }}
                  >
                    Click the "Capture & Play Music" button to analyze your
                    emotion and get personalized music recommendations from
                    YouTube.
                  </Typography>
                </Box>
              )}
            </Box>

            {currentTrack && (
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderTop: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  bgcolor: "rgba(20, 20, 20, 0.8)",
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: "rgba(255,255,255,0.1)",
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                      onClick={handlePrevious}
                      disabled={!currentTrack}
                      color="inherit"
                      size="medium"
                    >
                      <SkipPrevious fontSize="medium" />
                    </IconButton>
                    <Button
                      variant="contained"
                      color={isPlaying ? "primary" : "secondary"}
                      onClick={togglePlayPause}
                      disabled={!currentTrack}
                      sx={{
                        mx: { xs: 1, sm: 1.5 },
                        minWidth: { xs: "48px", sm: "56px" },
                        width: { xs: "48px", sm: "56px" },
                        height: { xs: "48px", sm: "56px" },
                        borderRadius: "50%",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                        background: isPlaying
                          ? "linear-gradient(45deg, #9c27b0 30%, #f50057 90%)"
                          : "linear-gradient(45deg, #f50057 30%, #9c27b0 90%)",
                      }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </Button>
                    <IconButton
                      onClick={handleNext}
                      disabled={!currentTrack}
                      color="inherit"
                      size="medium"
                    >
                      <SkipNext fontSize="medium" />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: { xs: "100px", sm: "140px" },
                    }}
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
                <YouTube
                  videoId={currentTrack ? currentTrack.videoId : ""}
                  opts={opts}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  style={{ display: "none" }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </ThemeProvider>
  );
}

export default Home;
