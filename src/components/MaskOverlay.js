import React, { useRef, useEffect } from "react";
import * as faceapi from "face-api.js";

const MaskOverlay = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    const detectFace = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      setInterval(async () => {
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const landmarks = detections.landmarks;
          const jawOutline = landmarks.getJawOutline();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const mouth = landmarks.getMouth();

          // Draw a mask overlay
          ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
          ctx.beginPath();
          jawOutline.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point._x, point._y);
            else ctx.lineTo(point._x, point._y);
          });
          ctx.closePath();
          ctx.fill();
        }
      }, 100);
    };

    startVideo().then(() => loadModels().then(detectFace));
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay muted playsInline />
      <canvas ref={canvasRef} />
    </div>
  );
};

export default MaskOverlay;
