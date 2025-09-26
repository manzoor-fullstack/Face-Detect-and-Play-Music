import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

function EmotionDetector({ videoRef, canvasRef, onEmotionChange, onError }) {
  const isMountedRef = useRef(true);
  const detectionLoopRef = useRef(null);
  const lastEmotionRef = useRef("Neutral");
  const [isLoading, setIsLoading] = useState(true);

  const detectEmotions = async () => {
    if (!isMountedRef.current || !videoRef.current || !canvasRef.current)
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let newEmotion = "Neutral";

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const sortedExpressions = Object.entries(expressions).sort(
          (a, b) => b[1] - a[1]
        );
        const [topEmotion, topScore] = sortedExpressions[0];

        if (topScore > 0.2) {
          if (topEmotion === "sad") {
            newEmotion = "Lonely"; // Custom mapping
          } else {
            newEmotion =
              topEmotion.charAt(0).toUpperCase() + topEmotion.slice(1);
          }
        }

        const { x, y, width, height } = detections[0].detection.box;
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "green";
        ctx.stroke();

        // Draw emotion label
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(newEmotion, x, y - 10);
      }

      if (lastEmotionRef.current !== newEmotion) {
        lastEmotionRef.current = newEmotion;
        onEmotionChange(newEmotion);
      }
    } catch (err) {
      console.error("Detection error:", err);
      onError(`Detection error: ${err.message}`);
    }

    detectionLoopRef.current = setTimeout(detectEmotions, 100);
  };

  useEffect(() => {
    isMountedRef.current = true;

    const loadModelsAndStart = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        console.log("Face-api models loaded.");

        if (videoRef.current) {
          videoRef.current.addEventListener("play", detectEmotions);
          detectEmotions();
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Setup error:", err);
        onError(`Setup failed: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadModelsAndStart();

    return () => {
      isMountedRef.current = false;
      if (detectionLoopRef.current) {
        clearTimeout(detectionLoopRef.current);
      }
    };
  }, [videoRef, canvasRef, onEmotionChange, onError]);

  return isLoading ? <p>Loading emotion detection models...</p> : null;
}

export default EmotionDetector;
