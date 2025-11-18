import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

interface FaceDetectionResult {
  isFaceDetected: boolean;
  gazeDirection: string;
  focusScore: number;
}

export const useFaceDetection = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean
) => {
  const [result, setResult] = useState<FaceDetectionResult>({
    isFaceDetected: false,
    gazeDirection: "center",
    focusScore: 0,
  });
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Calculate gaze direction based on eye landmarks
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[1];

        const eyeCenter = {
          x: (leftEye.x + rightEye.x) / 2,
          y: (leftEye.y + rightEye.y) / 2,
        };

        const gazeX = noseTip.x - eyeCenter.x;
        const gazeY = noseTip.y - eyeCenter.y;

        let direction = "center";
        let score = 100;

        if (Math.abs(gazeX) > 0.02) {
          direction = gazeX > 0 ? "right" : "left";
          score = Math.max(0, 100 - Math.abs(gazeX) * 1000);
        } else if (Math.abs(gazeY) > 0.02) {
          direction = gazeY > 0 ? "down" : "up";
          score = Math.max(0, 100 - Math.abs(gazeY) * 1000);
        }

        setResult({
          isFaceDetected: true,
          gazeDirection: direction,
          focusScore: Math.round(score),
        });

        // Draw face mesh
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 1;
        
        for (const landmark of landmarks) {
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            1,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      } else {
        setResult({
          isFaceDetected: false,
          gazeDirection: "unknown",
          focusScore: 0,
        });
      }

      ctx.restore();
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await faceMesh.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    faceMeshRef.current = faceMesh;
    cameraRef.current = camera;

    camera.start();

    return () => {
      camera.stop();
      faceMesh.close();
    };
  }, [isActive, videoRef, canvasRef]);

  return result;
};