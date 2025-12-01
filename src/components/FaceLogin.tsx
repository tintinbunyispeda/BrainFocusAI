import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFaceAuth } from "@/hooks/useFaceAuth"; // Kita tetap pakai ini untuk nyalakan kamera
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, AlertCircle, Loader2, User, Mail } from "lucide-react";

interface FaceLoginProps {
  onSuccess: (email: string, userId: string) => void;
  onCancel: () => void;
}

const FaceLogin = ({ onSuccess, onCancel }: FaceLoginProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "face">("email");
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("Position your face to login");
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();
  
  // Kita gunakan hook ini HANYA untuk menyalakan kamera (startCamera/stopCamera)
  const { 
    isReady, 
    startCamera, 
    stopCamera 
  } = useFaceAuth(videoRef);

  useEffect(() => {
    if (isReady && step === "face") {
      startCamera();
    }
    
    return () => {
      if (step === "face") {
        stopCamera();
      }
    };
  }, [isReady, step, startCamera, stopCamera]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Cek apakah user ada di Supabase
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, nama")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        toast({ title: "Error", description: "Failed to look up account.", variant: "destructive" });
        return;
      }

      if (!profile) {
        toast({ title: "User Not Found", description: "Email not registered.", variant: "destructive" });
        return;
      }

      setUserName(profile.nama);
      setUserId(profile.id);
      setStep("face");
      setMessage(`Hi ${profile.nama}! Position your face to verify`);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  // --- BAGIAN INI YANG DIMODIFIKASI UNTUK PAKAI MODEL KAMU ---
  const handleFaceVerify = useCallback(async () => {
    if (isScanning || !videoRef.current) return;
    
    setIsScanning(true);
    setStatus("scanning");
    setMessage("Analyzing with your AI Model...");
    
    try {
      // 1. Ambil gambar dari Video Stream
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Failed to create canvas context");
      }
      
      // Gambar frame video ke canvas
      ctx.drawImage(video, 0, 0);
      
      // 2. Ubah Canvas ke File (Blob)
      canvas.toBlob(async (blob) => {
        if (!blob) {
            setStatus("error");
            setMessage("Failed to capture image");
            setIsScanning(false);
            return;
        }

        // 3. Kirim File ke Python Backend
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            // Pastikan URL ini sesuai dengan port main.py kamu
            const response = await fetch("http://localhost:8000/verify", {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) {
                throw new Error("Gagal terhubung ke Python Server");
            }

            const result = await response.json();
            console.log("AI Result:", result);

            // 4. Cek Hasil Prediksi
            if (result.match) {
                // Cek apakah nama dari AI sama dengan akun yang mau login
                // (Menggunakan lowercase agar case-insensitive)
                if (result.name.toLowerCase().includes(userName.toLowerCase()) || 
                    userName.toLowerCase().includes(result.name.toLowerCase())) {
                    
                    setStatus("success");
                    setMessage(`Verified! Welcome ${userName}`);
                    
                    toast({
                      title: "AI Verification Success! 🎉",
                      description: `Model recognized you with ${(result.score * 100).toFixed(1)}% similarity.`,
                    });
                    
                    setTimeout(() => {
                      onSuccess(email, userId);
                    }, 1000);
                } else {
                    setStatus("error");
                    setMessage(`Face mismatch! Recognized as: ${result.name}`);
                    setTimeout(() => setStatus("idle"), 2500);
                }
            } else {
                setStatus("error");
                setMessage("Face not recognized in database.");
                setTimeout(() => setStatus("idle"), 2000);
            }

        } catch (apiError) {
            console.error("API Error:", apiError);
            setStatus("error");
            setMessage("Is Python server running?"); // Pesan error kalau server mati
            setTimeout(() => setStatus("idle"), 3000);
        }
        
        setIsScanning(false);
      }, "image/jpeg", 0.9); // Kualitas JPG 0.9

    } catch (err) {
      console.error("Face verify error:", err);
      setStatus("error");
      setMessage("An error occurred during capture.");
      setTimeout(() => setStatus("idle"), 2000);
      setIsScanning(false);
    }
  }, [isScanning, userName, userId, email, toast, onSuccess]);

  // --- TAMPILAN (UI) ---

  // 1. Tampilan Input Email
  if (step === "email") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Face Login (Custom AI)
          </CardTitle>
          <CardDescription>
            Enter email to verify with your custom model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="face-login-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="face-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">Continue</Button>
            <Button onClick={onCancel} variant="ghost" className="w-full" type="button">Cancel</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // 2. Tampilan Scan Wajah
  return (
    <Card className="w-full max-w-md mx-auto shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Verify Your Face
        </CardTitle>
        <CardDescription>Look at the camera, {userName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }} // Mirror effect
          />
          
          {/* Overlay Status */}
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            status === "success" ? "bg-success text-white" :
            status === "error" ? "bg-destructive text-white" :
            status === "scanning" ? "bg-accent text-white" :
            "bg-background/80 text-foreground"
          }`}>
            {status === "scanning" && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
            {status === "success" && <CheckCircle className="w-4 h-4 inline mr-2" />}
            {status === "error" && <AlertCircle className="w-4 h-4 inline mr-2" />}
            {message}
          </div>
        </div>
        
        <Button 
          onClick={handleFaceVerify} 
          disabled={isScanning || status === "success"}
          className="w-full"
          size="lg"
        >
          {isScanning ? "Processing..." : "Verify Identity"}
        </Button>
        
        <Button onClick={() => setStep("email")} variant="outline" className="w-full">
          Change Email
        </Button>
      </CardContent>
    </Card>
  );
};

export default FaceLogin;