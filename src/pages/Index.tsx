import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Eye, TrendingUp, Play, BarChart, Camera, Shield, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
            Train Your
            <br />
            Focus Muscle
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time AI monitoring that helps you study smarter through advanced face detection, gaze tracking, and deep analytics
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow gap-2">
              <Play className="w-5 h-5" />
              Start Tracking
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="gap-2">
              <Camera className="w-5 h-5" />
              Face Login
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            ✨ New: Sign in securely with Face Recognition
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="shadow-card hover:shadow-glow transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Live Detection</CardTitle>
              <CardDescription>
                Real-time face & gaze tracking using advanced MediaPipe technology with pupil tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle>Deep Analytics</CardTitle>
              <CardDescription>
                Get detailed insights about your focus patterns with rich graphs & comprehensive stats
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Smart Recommendations</CardTitle>
              <CardDescription>
                Receive personalized AI-powered tips to level up your study productivity
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all hover:-translate-y-1 border-2 border-primary/20">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Face Login
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">New</span>
              </CardTitle>
              <CardDescription>
                Secure and fast authentication using facial recognition technology
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="space-y-8">
          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Register with Face</h3>
              <p className="text-muted-foreground">
                Create your account and register your face for secure, passwordless login
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Start Your Study Session</h3>
              <p className="text-muted-foreground">
                Select your study material and begin live focus monitoring with AI
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">AI Tracks Your Focus</h3>
              <p className="text-muted-foreground">
                The system detects your face and gaze direction in real-time, scoring your focus every second
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              4
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Review & Improve</h3>
              <p className="text-muted-foreground">
                Get detailed reports with focus graphs, distraction analytics, and AI recommendations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-muted/50 to-muted/20 border-2 border-primary/10">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Your Privacy Matters</h3>
                <p className="text-muted-foreground">
                  All face data is processed locally in your browser. We only store encrypted face descriptors, 
                  never actual images. Your study sessions and focus data are private and secure.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto shadow-glow bg-gradient-primary text-white border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-white/80" />
            </div>
            <CardTitle className="text-3xl text-white mb-2">Ready to Level Up Your Focus?</CardTitle>
            <CardDescription className="text-white/80 text-lg">
              Join students who are studying smarter with AI-powered focus tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="gap-2">
              <Play className="w-5 h-5" />
              Get Started Free
            </Button>
            <p className="text-white/60 text-sm">
              No credit card required • Works on all devices
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;