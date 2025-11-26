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

    // Store pending user data and switch to face registration
    setPendingUser({ email, password, nama });
    setAuthMode("face-register");
    setLoading(false);
  };

  const handleFaceRegistrationComplete = async (descriptors: Float32Array[]) => {
    if (!pendingUser) return;
    
    setLoading(true);
    
    try {
      // First, create the user account
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

      if (signUpError) {
        toast({
          title: "Error",
          description: signUpError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Save face descriptors to database
        const descriptorRecords = descriptors.map((descriptor, index) => ({
          user_id: authData.user!.id,
          descriptor: Array.from(descriptor),
          label: pendingUser.nama,
        }));

        const { error: descriptorError } = await supabase
          .from("face_descriptors")
          .insert(descriptorRecords);

        if (descriptorError) {
          console.error("Error saving face descriptors:", descriptorError);
          toast({
            title: "Warning",
            description: "Account created but face data could not be saved. You can add it later.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success! 🎉",
            description: "Account created with face login enabled!",
          });
        }
      }

      setPendingUser(null);
      setAuthMode("email");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
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
      // Call edge function to get auth token
      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { email, user_id: userId },
      });

      if (error || !data?.success) {
        console.error("Face auth error:", error || data?.error);
        toast({
          title: "Authentication Failed",
          description: data?.error || "Could not complete face login. Please try again.",
          variant: "destructive",
        });
        setAuthMode("email");
        setLoading(false);
        return;
      }

      // Verify the OTP token using token_hash
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: "recovery",
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        toast({
          title: "Login Failed",
          description: "Could not verify authentication. Please try email login.",
          variant: "destructive",
        });
        setAuthMode("email");
        setLoading(false);
        return;
      }

      // Success - the auth state change listener will handle navigation
      toast({
        title: "Welcome Back!",
        description: "Face login successful!",
      });
    } catch (err) {
      console.error("Face login error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setAuthMode("email");
    }
    
    setLoading(false);
  };

  // Face Login Mode
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

  // Face Registration Mode
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Focus Analytics</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Master Your Focus
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
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
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
              Sign In with Face
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
