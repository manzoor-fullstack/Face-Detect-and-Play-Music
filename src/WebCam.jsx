import React, { useState, useEffect, useRef } from "react";

function Webcam({ onLoaded, onError = console.error }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;

    const loadWebcam = async () => {
      try {
        console.log("Requesting webcam access...");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Webcam stream obtained");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            console.log("Webcam is playing.");
            setIsLoading(false);
            setError(null);
            onLoaded?.(videoRef, canvasRef);
          };
        }
      } catch (err) {
        console.error("Webcam error:", err);
        const errorMsg = `Webcam failed: ${err.message}`;
        setError(errorMsg);
        onError(errorMsg);
        setIsLoading(false);
      }
    };

    loadWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Webcam stream stopped.");
        });
      }
    };
  }, [onLoaded, onError]);

  return (
    <div style={{ position: "relative" }}>
      {isLoading && <p>Loading webcam...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="640"
        height="480"
        style={{ display: "block", margin: "0 auto" }} // Changed from "none" to "block"
      />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          border: "1px solid black",
        }}
      />
    </div>
  );
}

export default Webcam;
