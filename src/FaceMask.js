import React, { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

const FaceMask = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    loadModels().then(startVideo);
  }, []);

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawFaceLandmarks(canvas, detections);

      // Apply mask over nose & mouth area
      detections.forEach(det => {
        const { landmarks } = det;
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();

        ctx.fillStyle = "black"; // Mask color
        ctx.beginPath();
        ctx.moveTo(nose[0].x, nose[0].y);

        jaw.slice(6, 12).forEach((point) => ctx.lineTo(point.x, point.y));

        ctx.closePath();
        ctx.fill();
      });
    }, 100);
  };

  useEffect(() => {
    videoRef.current?.addEventListener("play", detectFaces);
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline width="640" height="480" />
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
};

export default FaceMask;
