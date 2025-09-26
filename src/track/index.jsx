import React, { useEffect, useState } from "react";
import axios from "axios";

const SpotifySearch = ({ capturedEmotion }) => {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [videoId, setVideoId] = useState(null);

  const handleSearch = async ({ capturedEmotion }) => {
    // try {
    //   const token = localStorage.getItem("spotifyToken");
    //   if (!token) {
    //     console.error("No access token found.");
    //     return;
    //   }
    //   const response = await axios.get("https://api.spotify.com/v1/search", {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //     },
    //     params: {
    //       q: capturedEmotion,
    //       type: "track",
    //       limit: 10,
    //     },
    //   });
    //   console.log(response.data.tracks.items);
    //   setTracks(response.data.tracks.items);
    // } catch (error) {
    //   console.error("Failed to fetch tracks:", error.response.data);
    // }
  };

  useEffect(() => {
    const API_KEY = "AIzaSyCWp_5i4fTCO57ssf1lYjjNiWgx9bKqwR0";
    const searchQuery = capturedEmotion
      ? capturedEmotion + " music"
      : "happy music";

    fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&videoCategoryId=10&maxResults=1&key=${API_KEY}`
    )
      .then((response) => response.json())
      .then((data) => {
        const videoId = data.items[0]?.id.videoId;
        if (videoId) {
          setVideoId(videoId);
        } else {
          console.error("No video found.");
        }
      })
      .catch((error) => console.error("Error fetching YouTube video:", error));
  }, [capturedEmotion]);

  return (
    <div>
      {videoId ? (
        <div style={{ marginTop: "20px" }}>
          <h3>Now Playing:</h3>
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          ></iframe>
        </div>
      ) : (
        <p>No video found for the current emotion.</p>
      )}
    </div>
  );
};

export default SpotifySearch;
