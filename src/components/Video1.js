import React, { useEffect, useRef } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const Video1= () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const setUpCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        };

        const mediastream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = mediastream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    const startBackgroundRemoval = async () => {
      const video = videoRef.current;
      if (!video) return;

      video.onloadeddata = async () => {
        const segmentation = new SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        segmentation.setOptions({ modelSelection: 1 });
        segmentation.onResults((results) => {
          const canvas = canvasRef.current;
          if (!canvas || !video.videoWidth || !video.videoHeight) return;

          const ctx = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.segmentationMask) {
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-in";
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        });

        await segmentation.initialize();
        const detectBackground = async () => {
          if (videoRef.current && video.videoWidth > 0) {
            await segmentation.send({ image: videoRef.current });
            requestAnimationFrame(detectBackground);
          }
        };
        detectBackground();
      };
    };

    setUpCamera().then(() => {
      startBackgroundRemoval();
    });
  }, []);

  return (
    <div style={{ position: "relative", width: "640px", height: "480px" }}>
      <video ref={videoRef} autoPlay playsInline muted width="640" height="480" style={{ position: "absolute", top: 0, left: 0, opacity: 0 }} />
      <canvas ref={canvasRef} width="640" height="480" style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
};

export default Video1;
