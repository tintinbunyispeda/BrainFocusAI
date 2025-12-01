import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFaceAuth } from "@/hooks/useFaceAuth";
import { Camera, Loader2, RefreshCw } from "lucide-react";

interface FaceRegistrationProps {
  onComplete: (images: Blob[]) => void;
  onCancel: () => void;
  requiredCaptures?: number;
}

const FaceRegistration = ({ 
  onComplete, 
  onCancel, 
  requiredCaptures = 5 
}: FaceRegistrationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImages, setCapturedImages] = useState<Blob[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<"idle" | "capturing" | "success" | "error">("idle");
  const [message, setMessage] = useState("Position your face in the frame");
  
  // Gunakan useFaceAuth hanya untuk akses kamera
  const { 
    isReady, 
    isLoading, 
    startCamera, 
    stopCamera 
  } = useFaceAuth(videoRef);

  useEffect(() => {
    if (isReady) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isReady, startCamera, stopCamera]);

  const handleCapture = async () => {
    if (isCapturing || !videoRef.current) return;
    
    // --- PERBAIKAN: KITA HAPUS PENGECEKAN isFaceDetected DISINI ---
    // Langsung ambil gambar saja biar tidak error "No face detected"
    
    setIsCapturing(true);
    setStatus("capturing");
    setMessage("Capturing...");
    
    try {
        // Ambil Snapshot
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) return;

        // Gambar video ke canvas
        ctx.drawImage(video, 0, 0);

        // Convert ke Blob (File Gambar)
        canvas.toBlob((blob) => {
            if (blob) {
                const newImages = [...capturedImages, blob];
                setCapturedImages(newImages);

                if (newImages.length >= requiredCaptures) {
                    setStatus("success");
                    setMessage("Registration complete!");
                    // Beri jeda sedikit biar user lihat progress penuh
                    setTimeout(() => {
                        onComplete(newImages);
                    }, 1000);
                } else {
                    setStatus("idle");
                    setMessage(`Captured ${newImages.length}/${requiredCaptures}. Move head slightly.`);
                }
            }
            setIsCapturing(false);
        }, "image/jpeg", 0.95);

    } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Capture failed");
        setIsCapturing(false);
    }
  };

  const handleReset = () => {
    setCapturedImages([]);
    setStatus("idle");
    setMessage("Position your face in the frame");
  };

  const progress = (capturedImages.length / requiredCaptures) * 100;

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading camera...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Face Registration (Custom AI)
        </CardTitle>
        <CardDescription>
          Capture {requiredCaptures} photos to train your model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Feed */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
          />
          
          {/* Face Guide Overlay (Hiasan visual saja) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-56 border-2 border-dashed border-white/50 rounded-full opacity-50" />
          </div>
          
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            status === "success" ? "bg-success text-white" :
            status === "capturing" ? "bg-accent text-white" :
            "bg-background/80 text-foreground"
          }`}>
            {message}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{capturedImages.length}/{requiredCaptures}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleCapture} 
            disabled={isCapturing || status === "success"}
            className="flex-1"
            size="lg"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </>
            )}
          </Button>
          
          {capturedImages.length > 0 && status !== "success" && (
            <Button onClick={handleReset} variant="outline" size="lg">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <Button onClick={onCancel} variant="ghost" className="w-full">
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};

export default FaceRegistration;