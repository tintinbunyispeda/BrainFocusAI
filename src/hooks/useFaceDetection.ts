import { useEffect, useRef, useState, useCallback } from "react";
import * as FaceMeshModule from "@mediapipe/face_mesh";
import * as CameraModule from "@mediapipe/camera_utils";

interface FaceDetectionResult {
  isFaceDetected: boolean;
  gazeDirection: string;
  focusScore: number;
  distractionType: string | null;
}

// Larger buffer for smoother results
const SMOOTHING_BUFFER_SIZE = 8;
const GAZE_HISTORY_SIZE = 10;

export const useFaceDetection = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean
) => {
  const [result, setResult] = useState<FaceDetectionResult>({
    isFaceDetected: false,
    gazeDirection: "center",
    focusScore: 0,
    distractionType: null,
  });
  const faceMeshRef = useRef<FaceMeshModule.FaceMesh | null>(null);
  const cameraRef = useRef<CameraModule.Camera | null>(null);
  const scoreBuffer = useRef<number[]>([]);
  const gazeHistoryX = useRef<number[]>([]);
  const gazeHistoryY = useRef<number[]>([]);
  const lastValidGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const stableFrameCount = useRef(0);
  const consecutiveDistractionFrames = useRef(0);
  const faceNotDetectedFrames = useRef(0);
  const baselineCalibrated = useRef(false);
  const baselineGaze = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const calibrationFrames = useRef<{ x: number; y: number }[]>([]);

  // Smooth the score with weighted average (recent values matter more)
  const smoothScore = useCallback((newScore: number): number => {
    scoreBuffer.current.push(newScore);
    if (scoreBuffer.current.length > SMOOTHING_BUFFER_SIZE) {
      scoreBuffer.current.shift();
    }
    
    // Weighted average - more recent scores have higher weight
    let weightedSum = 0;
    let totalWeight = 0;
    scoreBuffer.current.forEach((score, index) => {
      const weight = index + 1;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return Math.round(weightedSum / totalWeight);
  }, []);

  // Smooth gaze values to reduce jitter
  const smoothGaze = useCallback((x: number, y: number): { x: number; y: number } => {
    gazeHistoryX.current.push(x);
    gazeHistoryY.current.push(y);
    
    if (gazeHistoryX.current.length > GAZE_HISTORY_SIZE) {
      gazeHistoryX.current.shift();
      gazeHistoryY.current.shift();
    }
    
    // Remove outliers (values too far from median)
    const sortedX = [...gazeHistoryX.current].sort((a, b) => a - b);
    const sortedY = [...gazeHistoryY.current].sort((a, b) => a - b);
    const medianX = sortedX[Math.floor(sortedX.length / 2)];
    const medianY = sortedY[Math.floor(sortedY.length / 2)];
    
    // Filter out values more than 2x the median deviation
    const filteredX = gazeHistoryX.current.filter(v => Math.abs(v - medianX) < 0.1);
    const filteredY = gazeHistoryY.current.filter(v => Math.abs(v - medianY) < 0.1);
    
    const avgX = filteredX.length > 0 
      ? filteredX.reduce((a, b) => a + b, 0) / filteredX.length 
      : medianX;
    const avgY = filteredY.length > 0 
      ? filteredY.reduce((a, b) => a + b, 0) / filteredY.length 
      : medianY;
    
    return { x: avgX, y: avgY };
  }, []);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    // Reset all state when session starts
    scoreBuffer.current = [];
    gazeHistoryX.current = [];
    gazeHistoryY.current = [];
    stableFrameCount.current = 0;
    consecutiveDistractionFrames.current = 0;
    faceNotDetectedFrames.current = 0;
    baselineCalibrated.current = false;
    calibrationFrames.current = [];
    lastValidGaze.current = { x: 0, y: 0 };
    baselineGaze.current = { x: 0, y: 0 };

    const faceMesh = new FaceMeshModule.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
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
        faceNotDetectedFrames.current = 0;
        
        // Key facial landmarks
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[1];
        const foreheadCenter = landmarks[10];
        const chin = landmarks[152];
        
        // Iris landmarks for precise pupil tracking
        const leftIrisCenter = landmarks[468];
        const rightIrisCenter = landmarks[473];
        
        // Eye corner landmarks
        const leftEyeInner = landmarks[133];
        const leftEyeOuter = landmarks[33];
        const rightEyeInner = landmarks[362];
        const rightEyeOuter = landmarks[263];
        
        // Calculate eye widths for normalization
        const leftEyeWidth = Math.abs(leftEyeOuter.x - leftEyeInner.x);
        const rightEyeWidth = Math.abs(rightEyeOuter.x - rightEyeInner.x);
        
        // Skip if eye tracking is unreliable (eyes too small or too large)
        if (leftEyeWidth < 0.02 || rightEyeWidth < 0.02 || leftEyeWidth > 0.15 || rightEyeWidth > 0.15) {
          return;
        }
        
        // Calculate normalized iris offset (pupil position relative to eye center)
        const leftEyeCenterX = (leftEyeInner.x + leftEyeOuter.x) / 2;
        const rightEyeCenterX = (rightEyeInner.x + rightEyeOuter.x) / 2;
        
        const leftIrisOffset = (leftIrisCenter.x - leftEyeCenterX) / leftEyeWidth;
        const rightIrisOffset = (rightIrisCenter.x - rightEyeCenterX) / rightEyeWidth;
        const avgIrisOffsetX = (leftIrisOffset + rightIrisOffset) / 2;
        
        // Vertical iris offset
        const leftEyeTopY = landmarks[159].y;
        const leftEyeBottomY = landmarks[145].y;
        const rightEyeTopY = landmarks[386].y;
        const rightEyeBottomY = landmarks[374].y;
        const leftEyeHeight = Math.abs(leftEyeBottomY - leftEyeTopY);
        const rightEyeHeight = Math.abs(rightEyeBottomY - rightEyeTopY);
        
        const leftIrisOffsetY = (leftIrisCenter.y - (leftEyeTopY + leftEyeBottomY) / 2) / Math.max(leftEyeHeight, 0.01);
        const rightIrisOffsetY = (rightIrisCenter.y - (rightEyeTopY + rightEyeBottomY) / 2) / Math.max(rightEyeHeight, 0.01);
        const avgIrisOffsetY = (leftIrisOffsetY + rightIrisOffsetY) / 2;

        // Head pose estimation
        const eyeCenter = {
          x: (leftEye.x + rightEye.x) / 2,
          y: (leftEye.y + rightEye.y) / 2,
        };
        
        const headGazeX = noseTip.x - eyeCenter.x;
        const headGazeY = noseTip.y - eyeCenter.y;
        
        // Combine head pose and eye gaze (eye gaze is more sensitive for focus)
        const combinedGazeX = headGazeX * 0.4 + avgIrisOffsetX * 0.6;
        const combinedGazeY = headGazeY * 0.4 + avgIrisOffsetY * 0.3;
        
        // Auto-calibration during first 30 frames
        if (!baselineCalibrated.current) {
          calibrationFrames.current.push({ x: combinedGazeX, y: combinedGazeY });
          
          if (calibrationFrames.current.length >= 30) {
            // Calculate baseline as median of calibration frames
            const sortedCalX = calibrationFrames.current.map(f => f.x).sort((a, b) => a - b);
            const sortedCalY = calibrationFrames.current.map(f => f.y).sort((a, b) => a - b);
            baselineGaze.current = {
              x: sortedCalX[Math.floor(sortedCalX.length / 2)],
              y: sortedCalY[Math.floor(sortedCalY.length / 2)],
            };
            baselineCalibrated.current = true;
          }
          
          // During calibration, show good score
          setResult({
            isFaceDetected: true,
            gazeDirection: "center",
            focusScore: 100,
            distractionType: null,
          });
          
          // Draw calibration indicator
          ctx.fillStyle = "#3b82f6";
          ctx.font = "16px sans-serif";
          ctx.fillText(`Calibrating... ${calibrationFrames.current.length}/30`, 10, 30);
          ctx.restore();
          return;
        }
        
        // Apply baseline correction
        const correctedGazeX = combinedGazeX - baselineGaze.current.x;
        const correctedGazeY = combinedGazeY - baselineGaze.current.y;
        
        // Smooth the gaze values
        const smoothedGaze = smoothGaze(correctedGazeX, correctedGazeY);
        lastValidGaze.current = smoothedGaze;
        
        // Face tilt detection
        const faceHeight = Math.abs(foreheadCenter.y - chin.y);
        const faceCenterX = (leftEye.x + rightEye.x + noseTip.x) / 3;
        const verticalAlignment = Math.abs(noseTip.x - faceCenterX);
        
        // Adaptive thresholds - more forgiving for natural movements
        const horizontalThreshold = 0.035;  // Slight tolerance for reading
        const moderateHorizontalThreshold = 0.06;  // Looking slightly away
        const extremeHorizontalThreshold = 0.1;  // Clearly looking away
        const verticalThreshold = 0.04;  // Natural eye movement up/down
        const phoneThreshold = 0.08;  // Looking down at phone
        const tiltThreshold = 0.05;  // Head tilt tolerance
        
        let direction = "center";
        let rawScore = 100;
        let distraction: string | null = null;
        
        const absGazeX = Math.abs(smoothedGaze.x);
        const absGazeY = Math.abs(smoothedGaze.y);
        
        // Determine focus state - simplified distraction labels
        if (absGazeX <= horizontalThreshold && absGazeY <= verticalThreshold && verticalAlignment <= tiltThreshold) {
          // Fully focused
          direction = "center";
          distraction = null;
          rawScore = 100;
          stableFrameCount.current++;
          consecutiveDistractionFrames.current = 0;
        } else if (smoothedGaze.y > phoneThreshold) {
          // Looking down - phone
          direction = "down";
          consecutiveDistractionFrames.current++;
          if (consecutiveDistractionFrames.current > 5) {
            distraction = "using phone";
            rawScore = Math.max(20, 60 - (smoothedGaze.y - phoneThreshold) * 400);
          } else {
            rawScore = Math.max(50, 80 - consecutiveDistractionFrames.current * 5);
          }
          stableFrameCount.current = 0;
        } else if (absGazeX > extremeHorizontalThreshold) {
          // Looking away
          direction = smoothedGaze.x > 0 ? "right" : "left";
          consecutiveDistractionFrames.current++;
          if (consecutiveDistractionFrames.current > 4) {
            distraction = "looking away";
            rawScore = Math.max(25, 55 - (absGazeX - extremeHorizontalThreshold) * 200);
          } else {
            rawScore = Math.max(45, 75 - consecutiveDistractionFrames.current * 6);
          }
          stableFrameCount.current = 0;
        } else if (absGazeX > moderateHorizontalThreshold) {
          // Slightly distracted
          direction = smoothedGaze.x > 0 ? "right" : "left";
          consecutiveDistractionFrames.current++;
          if (consecutiveDistractionFrames.current > 8) {
            distraction = "distracted";
            rawScore = Math.max(40, 70 - (absGazeX - moderateHorizontalThreshold) * 150);
          } else {
            rawScore = Math.max(55, 85 - consecutiveDistractionFrames.current * 3);
          }
          stableFrameCount.current = Math.max(0, stableFrameCount.current - 1);
        } else if (absGazeX > horizontalThreshold) {
          // Minor gaze shift
          direction = smoothedGaze.x > 0 ? "right" : "left";
          rawScore = Math.max(70, 95 - (absGazeX - horizontalThreshold) * 100);
          if (consecutiveDistractionFrames.current > 15) {
            distraction = "wandering";
          }
          consecutiveDistractionFrames.current++;
        } else if (absGazeY > verticalThreshold) {
          // Looking up/down
          direction = smoothedGaze.y > 0 ? "down" : "up";
          if (absGazeY > phoneThreshold * 0.8) {
            consecutiveDistractionFrames.current++;
            if (consecutiveDistractionFrames.current > 6) {
              distraction = smoothedGaze.y > 0 ? "looking down" : "daydreaming";
              rawScore = Math.max(35, 65 - (absGazeY - verticalThreshold) * 200);
            } else {
              rawScore = Math.max(55, 80 - consecutiveDistractionFrames.current * 4);
            }
          } else {
            rawScore = Math.max(65, 90 - (absGazeY - verticalThreshold) * 100);
          }
          stableFrameCount.current = Math.max(0, stableFrameCount.current - 1);
        } else if (verticalAlignment > tiltThreshold) {
          // Head tilted
          direction = "tilted";
          if (verticalAlignment > tiltThreshold * 2) {
            consecutiveDistractionFrames.current++;
            if (consecutiveDistractionFrames.current > 10) {
              distraction = "resting";
              rawScore = Math.max(50, 75 - verticalAlignment * 200);
            }
          } else {
            rawScore = Math.max(70, 90 - verticalAlignment * 100);
          }
        }
        
        // Bonus for sustained focus
        if (stableFrameCount.current > 20) {
          rawScore = Math.min(100, rawScore + 5);
        } else if (stableFrameCount.current > 10) {
          rawScore = Math.min(100, rawScore + 2);
        }
        
        // Penalty for sustained distraction
        if (consecutiveDistractionFrames.current > 20) {
          rawScore = Math.max(10, rawScore - 10);
        }
        
        // Good face position bonus
        if (faceHeight > 0.2 && faceHeight < 0.7) {
          rawScore = Math.min(100, rawScore + 2);
        }

        const smoothedScore = smoothScore(rawScore);

        setResult({
          isFaceDetected: true,
          gazeDirection: direction,
          focusScore: smoothedScore,
          distractionType: distraction,
        });

        // Draw face mesh with color based on score
        const meshColor = smoothedScore >= 75 ? "#22c55e" : 
                         smoothedScore >= 50 ? "#f59e0b" : 
                         smoothedScore >= 30 ? "#f97316" : "#ef4444";
        ctx.fillStyle = meshColor;
        ctx.strokeStyle = meshColor;
        ctx.lineWidth = 1;
        
        // Draw key landmarks only for cleaner visualization
        const keyLandmarkIndices = [
          33, 133, 362, 263, // Eye corners
          468, 473, // Iris centers
          1, 10, 152, // Nose and face bounds
        ];
        
        for (const idx of keyLandmarkIndices) {
          const landmark = landmarks[idx];
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            2,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
        
        // Draw focus indicator
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = meshColor;
        ctx.fillText(`Focus: ${smoothedScore}%`, 10, 25);
        ctx.fillText(`Gaze: ${direction}`, 10, 45);
        
      } else {
        // Face not detected
        faceNotDetectedFrames.current++;
        
        // Grace period before marking as distraction
        if (faceNotDetectedFrames.current > 8) {
          setResult({
            isFaceDetected: false,
            gazeDirection: "unknown",
            focusScore: smoothScore(0),
            distractionType: "face_not_detected",
          });
        } else {
          // Keep previous score during brief face loss
          setResult(prev => ({
            ...prev,
            isFaceDetected: false,
            focusScore: smoothScore(Math.max(30, prev.focusScore - 5)),
          }));
        }
        
        stableFrameCount.current = 0;
        consecutiveDistractionFrames.current++;
        
        // Draw warning
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("Face not detected", 10, 30);
      }

      ctx.restore();
    });

    const camera = new CameraModule.Camera(videoRef.current, {
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
      scoreBuffer.current = [];
      gazeHistoryX.current = [];
      gazeHistoryY.current = [];
    };
  }, [isActive, videoRef, canvasRef, smoothScore, smoothGaze]);

  return result;
};
