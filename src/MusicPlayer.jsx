import React, { useEffect, useRef } from "react";

function MusicPlayer({ emotion }) {
  const audioRef = useRef(null);

  const emotionToMusic = {
    happy: "/music/happy.mp3",
    sad: "/music/sad.mp3",
    angry: "/music/angry.mp3",
    surprised: "/music/surprised.mp3",
  };

  useEffect(() => {
    if (audioRef.current) {
      const audioSrc = emotionToMusic[emotion];

      if (audioSrc) {
        audioRef.current.src = audioSrc;
        audioRef.current
          .play()
          .catch((error) => console.error("Audio play error:", error));
      } else {
        console.warn("No music file found for emotion:", emotion);
      }
    }
  }, [emotion]);

  return <audio ref={audioRef} controls />;
}

export default MusicPlayer;
