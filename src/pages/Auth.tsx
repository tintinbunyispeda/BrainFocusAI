import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Brain, Eye, TrendingUp, Camera, User } from "lucide-react";
import FaceLogin from "@/components/FaceLogin";
import FaceRegistration from "@/components/FaceRegistration";

type AuthMode = "email" | "face-login" | "face-register";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [pendingUser, setPendingUser] = useState<{ email: string; password: string; nama: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const nama = formData.get("nama") as string;

    // Simpan data sementara dan pindah ke scan wajah
    setPendingUser({ email, password, nama });
    setAuthMode("face-register");
    setLoading(false);
  };

  // --- BAGIAN INI YANG DIUBAH UNTUK KONEK KE PYTHON ---
  const handleFaceRegistrationComplete = async (images: Blob[]) => {
    if (!pendingUser) return;
    
    setLoading(true);
    
    try {
      // 1. Buat User di Supabase (Authentication)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: pendingUser.email,
        password: pendingUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            nama: pendingUser.nama,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. KIRIM DATA KE PYTHON (Agar bisa login pakai wajah)
      let pythonSuccess = false;
      
      // Kita kirim setiap foto yang dicapture ke Python untuk disimpan di database.json
      for (const imageBlob of images) {
          const formData = new FormData();
          formData.append("name", pendingUser.nama); // Nama user untuk label
          formData.append("file", imageBlob, "train.jpg"); // Foto wajah

          try {
              // Panggil API Python (/register)
              await fetch("http://localhost:8000/register", {
                  method: "POST",
                  body: formData
              });
              pythonSuccess = true;
          } catch (pyErr) {
              console.error("Python register fail:", pyErr);
          }
      }

      if (pythonSuccess) {
          toast({
            title: "Success! 🎉",
            description: "Akun dibuat & Model Wajah berhasil dilatih!",
          });
      } else {
          toast({
            title: "Warning",
            description: "Akun jadi, tapi gagal konek ke Python AI. Cek terminal Python.",
            variant: "destructive"
          });
      }

      setPendingUser(null);
      setAuthMode("email");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: error.message || "Registration failed.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleFaceRegistrationCancel = () => {
    setPendingUser(null);
    setAuthMode("email");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleFaceLoginSuccess = async (email: string, userId: string) => {
    setLoading(true);
    
    try {
      // Panggil edge function untuk magic link (supaya login resmi di supabase)
      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { email, user_id: userId },
      });

      if (error || !data?.success) {
        console.error("Face auth error:", error || data?.error);
        toast({
          title: "Authentication Failed",
          description: data?.error || "Gagal login via wajah.",
          variant: "destructive",
        });
        setAuthMode("email");
        setLoading(false);
        return;
      }

      // Redirect ke magic link
      window.location.href = data.action_link;
    } catch (err) {
      console.error("Face login error:", err);
      toast({
        title: "Error",
        description: "Terjadi kesalahan.",
        variant: "destructive",
      });
      setAuthMode("email");
      setLoading(false);
    }
  };

  // Tampilan Face Login
  if (authMode === "face-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <FaceLogin 
          onSuccess={handleFaceLoginSuccess}
          onCancel={() => setAuthMode("email")}
        />
      </div>
    );
  }

  // Tampilan Registrasi Wajah
  if (authMode === "face-register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <FaceRegistration
          onComplete={handleFaceRegistrationComplete}
          onCancel={handleFaceRegistrationCancel}
          requiredCaptures={5}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:block space-y-6">
          <div className="space-y-4">
            <img 
                src="/logo final ai.png" 
                className="w-21 h-21 object-contain centered"
              />
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent text-center">
              Study Buddy
            </h1>
            <p className="text-lg text-muted-foreground">
              Real-time AI monitoring to help you study smarter, not harder
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Live Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Track your focus in real-time with advanced face & gaze detection
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations to boost your productivity
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Camera className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Face Login</h3>
                <p className="text-sm text-muted-foreground">
                  Secure and fast authentication using facial recognition
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <Card className="shadow-glow">
          <CardHeader className="text-center" >
            <CardTitle> Welcome Back</CardTitle>
            <CardDescription>
              Sign in or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Face Login Button */}
            <Button 
              onClick={() => setAuthMode("face-login")}
              variant="outline"
              className="w-full gap-2 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
              size="lg"
            >
              <Camera className="w-5 h-5 text-primary" />
              Sign In with Face (Custom AI)
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Loading..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-nama">Full Name</Label>
                    <Input
                      id="register-nama"
                      name="nama"
                      type="text"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    <Camera className="w-4 h-4" />
                    {loading ? "Loading..." : "Continue to Face Setup"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You'll capture your face for secure face login
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;