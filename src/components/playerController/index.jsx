import React, { useState } from "react";

function PlayerControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleProgressChange = (e) => setProgress(e.target.value);
  const handleVolumeChange = (e) => setVolume(e.target.value);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <img
          src="https://via.placeholder.com/50"
          alt="Album"
          className="w-12 h-12 rounded mr-4"
        />
        <div>
          <p className="font-semibold">Song Title</p>
          <p className="text-sm text-gray-400">Artist Name</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-gray-300 hover:text-white">⏮</button>
        <button
          onClick={togglePlay}
          className="text-gray-300 hover:text-white text-2xl"
        >
          {isPlaying ? "⏸" : "⏯"}
        </button>
        <button className="text-gray-300 hover:text-white">⏭</button>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressChange}
          className="w-64 accent-blue-500"
        />
        <span className="text-sm text-gray-400">1:23 / 3:45</span>
      </div>
      <div className="flex items-center">
        <button className="text-gray-300 hover:text-white">🔊</button>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 accent-blue-500 ml-2"
        />
      </div>
    </div>
  );
}

export default PlayerControls;
