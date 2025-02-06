import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import "./Video.css";

const Video = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Store stream to restart video
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [videoOn, setVideoOn] = useState(true);
  const [bgRemoved, setBgRemoved] = useState(false);
  const lastMode = useRef(false); // Store last mode before video off

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.ageGenderNet.loadFromUri("/models");
        console.log("Face-API models loaded");
      } catch (error) {
        console.error("Error loading Face-API models:", error);
      }
    };

    const setUpCamera = async () => {
      try {
        const constraints = { video: { facingMode: "user", width: 320, height: 240 } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream; // Store the stream for later use
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    const detectFace = async () => {
      if (!videoRef.current) return;

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160 });
      setInterval(async () => {
        if (videoRef.current) {
          try {
            const detections = await faceapi
              .detectSingleFace(videoRef.current, options)
              .withAgeAndGender();
            if (detections) {
              setAge(Math.round(detections.age));
              setGender(detections.gender);
              console.log("Detection:", detections);
            } else {
              console.log("No face detected");
            }
          } catch (error) {
            console.error("Face detection error:", error);
          }
        }
      }, 2000);
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
          if (!canvasRef.current || !video.videoWidth || !video.videoHeight) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          canvas.width = 320;
          canvas.height = 240;

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

    const initialize = async () => {
      await loadModels();
      await setUpCamera();
      await detectFace();
      if (bgRemoved) startBackgroundRemoval();
    };

    if (videoOn) {
      initialize();
    }

    return () => {
      if (!videoOn && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop()); // Stop camera
      }
    };
  }, [videoOn, bgRemoved]);

  // Toggle Video On/Off
  const toggleVideo = () => {
    if (videoOn) {
      lastMode.current = bgRemoved; // Save last mode before turning off
      setVideoOn(false);
    } else {
      setVideoOn(true);
      setBgRemoved(lastMode.current); // Restore last mode
    }
  };

  // Toggle Background Removal
  const toggleBgRemoval = () => {
    setBgRemoved((prev) => !prev);
  };

  return (
    <div className="video-container">
      <div className="video-box">
        {videoOn ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className={bgRemoved ? "hidden-video" : "processed-video"} />
            {bgRemoved && <canvas ref={canvasRef} className="processed-video" />}
          </>
        ) : (
          <div className="video-off">Video is Off</div>
        )}
      </div>

      <div className="controls">
        {videoOn ? (
          bgRemoved ? (
            <>
              <button onClick={toggleBgRemoval}>Turn Off BG</button>
              <button onClick={toggleVideo}>Turn Off Video</button>
            </>
          ) : (
            <>
              <button onClick={toggleVideo}>Turn Off Video</button>
              <button onClick={toggleBgRemoval}>Remove BG</button>
            </>
          )
        ) : (
          <button onClick={toggleVideo}>Turn On Video</button>
        )}
      </div>

      <div className="info-box">
        <p>Gender: {gender}</p>
        <p>Age: {age}</p>
      </div>
    </div>
  );
};

export default Video;
