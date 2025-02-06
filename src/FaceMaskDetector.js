import { useState, useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web';

const FaceMaskDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [isMask, setIsMask] = useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const session = await ort.InferenceSession.create('/nms-yolo-nas.onnx');
        setModel(session);
        setLoading(false);
        startCamera();
      } catch (e) {
        console.error('Failed to load model:', e);
      }
    };

    loadModel();

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject?.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const processFrame = async () => {
    if (!model || !videoRef.current || videoRef.current.readyState < 2) {
      requestAnimationFrame(processFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0, 224, 224);
    
    // Preprocess image
    const imageData = ctx.getImageData(0, 0, 224, 224);
    const input = preprocess(imageData.data);
    
    // Run inference
    const results = await runInference(input);
    
    // Update state
    setIsMask(results > 0.5);

    requestAnimationFrame(processFrame);
  };

  const preprocess = (data) => {
    const input = new Float32Array(1 * 3 * 224 * 224);
    for (let i = 0; i < data.length; i += 4) {
      input[i / 4] = (data[i] / 255);         // R
      input[i / 4 + 224 * 224] = (data[i + 1] / 255); // G
      input[i / 4 + 224 * 224 * 2] = (data[i + 2] / 255); // B
    }
    return input;
  };

  const runInference = async (input) => {
    const tensor = new ort.Tensor('float32', input, [1, 3, 224, 224]);
    const { output } = await model.run({ input: tensor });
    return output.data[0];
  };

  return (
    <div style={{ position: 'relative' }}>
      {loading && <div>Loading model...</div>}
      <video ref={videoRef} width="224" height="224" style={{ display: 'none' }} />
      <canvas ref={canvasRef} width="224" height="224" />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 250,
        fontSize: '24px',
        color: isMask ? 'green' : 'red'
      }}>
        {isMask ? 'Mask Detected ✅' : 'No Mask ❌'}
      </div>
    </div>
  );
};

export default FaceMaskDetector;