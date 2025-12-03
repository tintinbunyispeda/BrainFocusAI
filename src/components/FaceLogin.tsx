import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFaceAuth } from "@/hooks/useFaceAuth"; 
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, AlertCircle, Loader2, User, Mail, ScanFace } from "lucide-react";

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

  // --- LOGIC BARU: AUTO SCANNING ---
  useEffect(() => {
    let scanInterval: NodeJS.Timeout;

    // Jalankan loop hanya jika:
    // 1. Sudah di step wajah
    // 2. Kamera siap
    // 3. Belum sukses login
    // 4. Tidak sedang memproses request (isScanning false)
    if (step === "face" && isReady && status !== "success") {
      scanInterval = setInterval(() => {
        if (!isScanning) {
           handleFaceVerify();
        }
      }, 1500); // Cek setiap 1.5 detik (biar gak spamming banget ke server)
    }

    return () => clearInterval(scanInterval);
  }, [step, isReady, status, isScanning]); // Dependencies penting!


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
      setMessage(`Hi ${profile.nama}! Looking for you...`);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  const handleFaceVerify = useCallback(async () => {
    // Safety check biar gak double request
    if (isScanning || !videoRef.current || status === "success") return;
    
    setIsScanning(true);
    // Kita tidak setStatus("scanning") disini supaya UI tidak kedip-kedip kuning terus
    // Cukup biarkan status terakhir, atau update message saja.
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        setIsScanning(false);
        return;
      }
      
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
            setIsScanning(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            const response = await fetch("http://localhost:8000/verify", {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) {
                 // Kalau server error, baru kita kasih tau user
                 console.error("Python Server Error");
                 setIsScanning(false);
                 return;
            }

            const result = await response.json();
            console.log("Auto Scan Result:", result);

            if (result.match) {
                // VERIFIKASI NAMA
                if (result.name.toLowerCase().includes(userName.toLowerCase()) || 
                    userName.toLowerCase().includes(result.name.toLowerCase())) {
                    
                    setStatus("success");
                    setMessage(`Verified! Welcome ${userName}`);
                    
                    toast({
                      title: "Login Success! 🎉",
                      description: `Identified as ${result.name} (${(result.score * 100).toFixed(0)}%)`,
                    });
                    
                    setTimeout(() => {
                      onSuccess(email, userId);
                    }, 1000);
                } else {
                    // Wajah ada, tapi bukan user yang dimaksud
                    // Jangan set error merah, cukup info text saja biar halus
                    setMessage(`Wrong person. Found: ${result.name}`);
                }
            } else {
                // Wajah tidak dikenali
                setMessage("Scanning... Face not recognized yet.");
            }

        } catch (apiError) {
            console.error("API Connection Error:", apiError);
            // Jangan spam error toast kalau server mati, cukup di console
        }
        
        setIsScanning(false);
      }, "image/jpeg", 0.8); // Compress dikit biar cepet uploadnya

    } catch (err) {
      console.error("Capture error:", err);
      setIsScanning(false);
    }
  }, [isScanning, userName, userId, email, toast, onSuccess, status]); // Tambah status ke dependency

  // --- TAMPILAN EMAIL (STEP 1) ---
  if (step === "email") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary" />
            Face Login
          </CardTitle>
          <CardDescription>
            Enter email to activate face scanner
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

  // --- TAMPILAN SCANNING (STEP 2) ---
  return (
    <Card className="w-full max-w-md mx-auto shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Verify Your Face
        </CardTitle>
        <CardDescription>
           Hello <b>{userName}</b>, please look at the camera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }} 
          />
          
          {/* Scanning Animation Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             {status !== "success" && (
                <div className="w-64 h-1 bg-primary/50 absolute animate-[scan_2s_ease-in-out_infinite] top-0 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                     style={{ animationName: 'scanVertical' }} />
             )}
             
             {/* Kotak Wajah */}
             <div className={`w-48 h-56 border-2 rounded-xl transition-all duration-500 ${
                 status === "success" ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]" : 
                 "border-white/30"
             }`} />
          </div>

          {/* Status Badge */}
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all w-max max-w-[90%] text-center truncate ${
            status === "success" ? "bg-green-500 text-white" :
            "bg-black/60 text-white backdrop-blur-sm"
          }`}>
            {status === "success" && <CheckCircle className="w-4 h-4 inline mr-2" />}
            {status !== "success" && <Loader2 className="w-3 h-3 animate-spin inline mr-2" />}
            {message}
          </div>
        </div>
        
        {/* Tombol sekarang hanya indikator, tidak perlu diklik */}
        <Button 
          disabled={true} // Selalu disabled karena otomatis
          className="w-full opacity-90"
          size="lg"
          variant={status === "success" ? "default" : "secondary"}
        >
          {status === "success" ? "Verification Complete" : "Auto-Scanning Active..."}
        </Button>
        
        <Button onClick={() => setStep("email")} variant="ghost" className="w-full">
          Back to Email
        </Button>
      </CardContent>
      
      {/* Tambahkan style untuk animasi scan garis */}
      <style>{`
        @keyframes scanVertical {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </Card>
  );
};

export default FaceLogin;