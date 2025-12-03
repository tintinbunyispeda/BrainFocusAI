// [File: src/components/FaceRegistration.tsx]

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFaceAuth } from "@/hooks/useFaceAuth";
import { Camera, Loader2, RefreshCw, Play } from "lucide-react"; // Tambah icon Play

interface FaceRegistrationProps {
  onComplete: (images: Blob[]) => void;
  onCancel: () => void;
  requiredCaptures?: number;
}

const FaceRegistration = ({ 
  onComplete, 
  onCancel, 
  // UBAH 1: Default capture diperbanyak jadi 30 biar kaya video/gojek
  requiredCaptures = 30 
}: FaceRegistrationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImages, setCapturedImages] = useState<Blob[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<"idle" | "capturing" | "success" | "error">("idle");
  // UBAH 2: Pesan default yang lebih sesuai
  const [message, setMessage] = useState("Press Start to begin scanning");
  
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

  // UBAH 3: Logic Auto Capture (Looping)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isCapturing && status === "capturing") {
      intervalId = setInterval(() => {
        captureSingleFrame();
      }, 100); // Ambil gambar setiap 100ms (10 fps)
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCapturing, status, capturedImages.length]); 
  // Dependency ke capturedImages.length penting biar dia cek terus limitnya

  // Fungsi pembantu untuk ambil 1 frame (dipisahkan dari logic tombol)
  const captureSingleFrame = () => {
    if (!videoRef.current) return;

    // Cek apakah sudah selesai
    // PENTING: Gunakan functional update atau ref untuk akses state terbaru di dalam interval
    setCapturedImages(prevImages => {
        if (prevImages.length >= requiredCaptures) {
            finishCapture(prevImages);
            return prevImages;
        }

        const video = videoRef.current;
        if (!video) return prevImages;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) return prevImages;

        ctx.drawImage(video, 0, 0);

        // Convert sync to Blob is hard, so toBlob is async. 
        // Utk performa tinggi "ala video", kita bisa pakai toDataURL lalu convert ke Blob, 
        // atau biarkan async tapi handle race condition. 
        // Disini kita pakai cara aman simple:
        
        canvas.toBlob((blob) => {
            if (blob) {
                setCapturedImages(current => {
                    // Cek lagi limit didalam callback async
                    if (current.length >= requiredCaptures) return current; 
                    return [...current, blob];
                });
            }
        }, "image/jpeg", 0.8); // Kualitas 0.8 biar ringan karena banyak file

        return prevImages; // State tidak berubah langsung disini karena async blob
    });
  };

  const finishCapture = (finalImages: Blob[]) => {
    setIsCapturing(false);
    setStatus("success");
    setMessage("Scan complete! Processing...");
    setTimeout(() => {
        onComplete(finalImages);
    }, 1000);
  };

  // UBAH 4: Tombol start trigger scan otomatis
  const handleStartScanning = () => {
    setCapturedImages([]); // Reset dulu
    setIsCapturing(true);
    setStatus("capturing");
    setMessage("Hold still and move your head slightly...");
  };

  const handleReset = () => {
    setCapturedImages([]);
    setStatus("idle");
    setIsCapturing(false);
    setMessage("Press Start to begin scanning");
  };

  const progress = (capturedImages.length / requiredCaptures) * 100;

  // ... (Bagian Loading tetap sama) ...
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
          Face Registration
        </CardTitle>
        <CardDescription>
          {/* Update text instruksi */}
          Keep your face in the frame while scanning.
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
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Visual circle ala Gojek saat scanning */}
            <div className={`w-48 h-56 border-2 border-dashed rounded-full transition-colors duration-300 ${
                isCapturing ? "border-primary animate-pulse" : "border-white/50"
            }`} />
          </div>
          
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            status === "success" ? "bg-success text-white" :
            status === "capturing" ? "bg-primary text-primary-foreground animate-pulse" :
            "bg-background/80 text-foreground"
          }`}>
            {/* Tampilkan progress angka saat capturing */}
            {status === "capturing" 
                ? `Scanning... ${Math.round(progress)}%` 
                : message}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Scan Progress</span>
            <span className="font-medium">{capturedImages.length}/{requiredCaptures}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleStartScanning} 
            disabled={isCapturing || status === "success"}
            className="flex-1"
            size="lg"
            variant={isCapturing ? "secondary" : "default"}
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : status === "success" ? (
              <>
                 <Camera className="w-4 h-4 mr-2" />
                 Done
              </>
            ) : (
              <>
                {/* Ganti icon jadi Play/Start biar user tau ini otomatis */}
                <Play className="w-4 h-4 mr-2" />
                Start Face Scan
              </>
            )}
          </Button>
          
          {/* Tombol reset tetap ada jika user ingin ulang */}
          {capturedImages.length > 0 && status !== "success" && !isCapturing && (
            <Button onClick={handleReset} variant="outline" size="lg">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <Button onClick={onCancel} variant="ghost" className="w-full" disabled={isCapturing}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};

export default FaceRegistration;