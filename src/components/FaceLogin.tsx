import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFaceAuth } from "@/hooks/useFaceAuth";
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
  const [userDescriptors, setUserDescriptors] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();
  
  const { 
    isReady, 
    isLoading, 
    error, 
    captureFaceDescriptor, 
    findMatchingFace,
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
      // Find profile by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, nama")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        toast({
          title: "Error",
          description: "Failed to look up account. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!profile) {
        toast({
          title: "User Not Found",
          description: "No account found with this email. Please sign up first.",
          variant: "destructive",
        });
        return;
      }

      // Get face descriptors for this user
      const { data: descriptors, error: descriptorError } = await supabase
        .from("face_descriptors")
        .select("*")
        .eq("user_id", profile.id);

      if (descriptorError || !descriptors || descriptors.length === 0) {
        toast({
          title: "Face Not Registered",
          description: "No face data found for this account. Please use email/password login.",
          variant: "destructive",
        });
        return;
      }

      setUserDescriptors(descriptors);
      setUserName(profile.nama);
      setUserId(profile.id);
      setStep("face");
      setMessage(`Hi ${profile.nama}! Position your face to verify`);
    } catch (err) {
      console.error("Email lookup error:", err);
      toast({
        title: "Error",
        description: "Failed to look up account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFaceVerify = useCallback(async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setStatus("scanning");
    setMessage("Scanning your face...");
    
    try {
      // Capture face descriptor
      const descriptor = await captureFaceDescriptor();
      
      if (!descriptor) {
        setStatus("error");
        setMessage("Face not detected. Please position your face clearly.");
        setTimeout(() => setStatus("idle"), 2000);
        setIsScanning(false);
        return;
      }
      
      // Compare with stored descriptors
      const storedDescriptors = userDescriptors.map(d => ({
        descriptor: d.descriptor as number[],
        label: d.user_id,
      }));
      
      const match = findMatchingFace(descriptor, storedDescriptors, 0.5);
      
      if (match.matched) {
        setStatus("success");
        setMessage(`Welcome back, ${userName}!`);
        
        toast({
          title: "Face Verified! 🎉",
          description: `Logging you in...`,
        });
        
        setTimeout(() => {
          onSuccess(email, userId);
        }, 1000);
      } else {
        setStatus("error");
        setMessage("Face not recognized. Please try again.");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch (err) {
      console.error("Face verify error:", err);
      setStatus("error");
      setMessage("An error occurred. Please try again.");
      setTimeout(() => setStatus("idle"), 2000);
    }
    
    setIsScanning(false);
  }, [isScanning, captureFaceDescriptor, findMatchingFace, userDescriptors, userName, userId, email, toast, onSuccess]);

  // Email Step
  if (step === "email") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Face Login
          </CardTitle>
          <CardDescription>
            Enter your email to continue with face authentication
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
            
            <Button type="submit" className="w-full" size="lg">
              Continue to Face Scan
            </Button>
            
            <Button onClick={onCancel} variant="ghost" className="w-full" type="button">
              Use Email/Password Instead
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading face recognition...</p>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-destructive">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button onClick={onCancel} variant="outline">Use Email Login</Button>
        </CardContent>
      </Card>
    );
  }

  // Face Verification Step
  return (
    <Card className="w-full max-w-md mx-auto shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Verify Your Face
        </CardTitle>
        <CardDescription>
          Look at the camera to verify it's you, {userName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Feed */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
          />
          
          {/* Face Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-48 h-56 border-4 rounded-full transition-all duration-300 ${
              status === "scanning" ? "border-accent animate-pulse scale-105" :
              status === "success" ? "border-success" :
              status === "error" ? "border-destructive" :
              "border-primary/50"
            }`} />
          </div>
          
          {/* Status Badge */}
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
          
          {/* Success Animation */}
          {status === "success" && (
            <div className="absolute inset-0 bg-success/20 flex items-center justify-center animate-pulse">
              <CheckCircle className="w-24 h-24 text-success" />
            </div>
          )}
        </div>
        
        {/* Actions */}
        <Button 
          onClick={handleFaceVerify} 
          disabled={isScanning || status === "success"}
          className="w-full"
          size="lg"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verified!
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Verify My Face
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button onClick={() => setStep("email")} variant="outline" className="flex-1">
            Change Email
          </Button>
          <Button onClick={onCancel} variant="ghost" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FaceLogin;
