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
        
        // Key facial landmarks for better tracking
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[1];
        const chin = landmarks[152];
        const foreheadCenter = landmarks[10];
        
        // Calculate face center and eye center
        const faceCenter = {
          x: (leftEye.x + rightEye.x + noseTip.x + chin.x) / 4,
          y: (leftEye.y + rightEye.y + noseTip.y + chin.y) / 4,
        };
        
        const eyeCenter = {
          x: (leftEye.x + rightEye.x) / 2,
          y: (leftEye.y + rightEye.y) / 2,
        };

        // Calculate head pose angles
        const gazeX = noseTip.x - eyeCenter.x;
        const gazeY = noseTip.y - eyeCenter.y;
        
        // Calculate face tilt (vertical alignment)
        const faceHeight = Math.abs(foreheadCenter.y - chin.y);
        const verticalAlignment = Math.abs(noseTip.x - faceCenter.x);
        
        // More precise thresholds for focus detection
        const horizontalThreshold = 0.035; // Looking left/right
        const verticalThreshold = 0.04;    // Looking up/down
        const tiltThreshold = 0.05;         // Head tilt tolerance

        let direction = "center";
        let score = 100;
        
        // Check horizontal gaze (left/right)
        if (Math.abs(gazeX) > horizontalThreshold) {
          direction = gazeX > 0 ? "right" : "left";
          const deviation = Math.abs(gazeX) - horizontalThreshold;
          score = Math.max(30, 100 - (deviation * 1500));
        } 
        // Check vertical gaze (up/down)
        else if (Math.abs(gazeY) > verticalThreshold) {
          direction = gazeY > 0 ? "down" : "up";
          const deviation = Math.abs(gazeY) - verticalThreshold;
          score = Math.max(30, 100 - (deviation * 1200));
        }
        // Check head tilt
        else if (verticalAlignment > tiltThreshold) {
          direction = "tilted";
          score = Math.max(50, 100 - (verticalAlignment * 800));
        }
        // Face is properly aligned - give high focus score
        else {
          direction = "center";
          score = 100;
        }
        
        // Bonus points for face stability and proper positioning
        if (faceHeight > 0.3 && faceHeight < 0.7) {
          score = Math.min(100, score + 5); // Face is at good distance
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