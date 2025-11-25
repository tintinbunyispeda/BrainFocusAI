import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { Play, Square, Brain, Eye, Activity, AlertTriangle, BookOpen } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [user, setUser] = useState<any>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [focusData, setFocusData] = useState<any[]>([]);
  const [distractionCount, setDistractionCount] = useState(0);
  const [materialName, setMaterialName] = useState("");
  const [materialCategory, setMaterialCategory] = useState("Mathematics");
  const [existingMaterials, setExistingMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");

  const faceDetection = useFaceDetection(videoRef, canvasRef, isSessionActive);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadExistingMaterials();
    }
  }, [user]);

  const loadExistingMaterials = async () => {
    const { data } = await supabase
      .from("study_materials")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setExistingMaterials(data);
    }
  };

  useEffect(() => {
    if (!isSessionActive || !sessionStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime]);

  useEffect(() => {
    if (!isSessionActive || !sessionId || elapsedTime <= 0) return;

    // Add focus data point for chart
    setFocusData((prev) => [
      ...prev.slice(-59),
      {
        second: elapsedTime,
        score: faceDetection.focusScore,
      },
    ]);

    // Save to database
    if (faceDetection.isFaceDetected) {
      supabase.from("focus_details").insert({
        session_id: sessionId,
        detik_ke: elapsedTime,
        skor: faceDetection.focusScore,
        arah_tatapan: faceDetection.gazeDirection,
        status_wajah: "detected",
      }).then();

      // Log distraction if detected (even when face is detected but not focused)
      if (faceDetection.distractionType) {
        setDistractionCount((prev) => prev + 1);
        
        supabase.from("distractions").insert({
          session_id: sessionId,
          jenis: faceDetection.distractionType,
          durasi: 1,
        }).then();
      }
    } else {
      supabase.from("focus_details").insert({
        session_id: sessionId,
        detik_ke: elapsedTime,
        skor: 0,
        arah_tatapan: "unknown",
        status_wajah: "not_detected",
      }).then();

      setDistractionCount((prev) => prev + 1);

      supabase.from("distractions").insert({
        session_id: sessionId,
        jenis: faceDetection.distractionType || "face_not_detected",
        durasi: 1,
      }).then();
    }
  }, [
    isSessionActive,
    sessionId,
    elapsedTime,
    faceDetection.focusScore,
    faceDetection.isFaceDetected,
    faceDetection.gazeDirection,
  ]);

  const handleStartSession = async () => {
    // Check if using existing material or new material
    if (selectedMaterialId) {
      // Using existing material
      const selectedMaterial = existingMaterials.find(m => m.id === selectedMaterialId);
      if (!selectedMaterial) {
        toast({
          title: "Error",
          description: "Selected material not found",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          material_name: selectedMaterial.name,
          material_category: selectedMaterial.category,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to start session",
          variant: "destructive",
        });
        return;
      }

      setSessionId(data.id);
      setSessionStartTime(new Date());
      setIsSessionActive(true);
      setFocusData([]);
      setDistractionCount(0);

      toast({
        title: "Session Started! 🚀",
        description: `Studying ${selectedMaterial.name}`,
      });
    } else {
      // Using new material name
      if (!materialName.trim()) {
        toast({
          title: "Material Required",
          description: "Please select an existing material or enter a new one",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          material_name: materialName,
          material_category: materialCategory,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to start session",
          variant: "destructive",
        });
        return;
      }

      setSessionId(data.id);
      setSessionStartTime(new Date());
      setIsSessionActive(true);
      setFocusData([]);
      setDistractionCount(0);

      toast({
        title: "Session Started! 🚀",
        description: "Your study session has begun",
      });
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    const avgScore = focusData.length > 0
      ? focusData.reduce((sum, d) => sum + d.score, 0) / focusData.length
      : 0;

    const { error } = await supabase
      .from("sessions")
      .update({
        selesai: new Date().toISOString(),
        skor_rata: avgScore,
        durasi_efektif: elapsedTime,
      })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
      return;
    }

    setIsSessionActive(false);
    toast({
      title: "Session Ended",
      description: "Your study session has been saved",
    });

    setTimeout(() => {
      navigate(`/session/${sessionId}`);
    }, 1000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Hey, {user?.user_metadata?.nama?.split(" ")[0] || "Friend"} 👋
              </h1>
              <p className="text-muted-foreground">
                {isSessionActive 
                  ? "Stay locked in! You're crushing it 🔥" 
                  : "Ready to level up today? Let's go!"}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Feed */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-card border-2 border-primary/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        Live Monitoring
                      </CardTitle>
                      <CardDescription>
                        AI tracks your face & gaze direction in real-time
                      </CardDescription>
                    </div>
                    {isSessionActive ? (
                      <Button onClick={handleEndSession} variant="destructive" size="lg" className="shadow-glow">
                        <Square className="w-4 h-4 mr-2" />
                        End Session
                      </Button>
                    ) : (
                      <Button onClick={handleStartSession} size="lg" className="shadow-glow">
                        <Play className="w-4 h-4 mr-2" />
                        Start Session
                      </Button>
                    )}
                  </div>
                </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover ${isSessionActive ? 'opacity-100' : 'opacity-40'}`}
                    autoPlay
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover ${!isSessionActive ? 'opacity-0' : 'opacity-100'}`}
                    width={640}
                    height={480}
                  />
                  {!isSessionActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm">
                      <Brain className="w-16 h-16 text-primary mb-4 animate-pulse" />
                      <p className="text-foreground text-lg font-medium">Click "Start Session" to begin</p>
                      <p className="text-muted-foreground text-sm mt-2">Make sure your camera is ready!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

              {isSessionActive && (
                <Card className="shadow-card border-2 border-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      Real-Time Focus Graph
                    </CardTitle>
                    <CardDescription>Tracking focus score for the last 60 seconds</CardDescription>
                  </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={focusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="second" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">

            {isSessionActive && (
              <>
                <Card className="shadow-card bg-gradient-primary text-white border-0">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-white" />
                      <CardTitle className="text-white">Session Time</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-5xl font-bold tabular-nums">{formatTime(elapsedTime)}</p>
                    <p className="text-white/80 text-sm mt-2">
                      {elapsedTime >= 1500 ? "Nice! Time for a quick break 😊" : "Keep pushing!"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-2 border-success/30">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-success" />
                      <CardTitle>Current Focus Status</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Current Score</p>
                        <span className={`text-2xl font-bold ${
                          faceDetection.focusScore >= 80 ? "text-success" :
                          faceDetection.focusScore >= 60 ? "text-accent" : "text-destructive"
                        }`}>
                          {faceDetection.focusScore}
                        </span>
                      </div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-success transition-all rounded-full"
                          style={{ width: `${faceDetection.focusScore}%` }}
                        />
                      </div>
                      {faceDetection.focusScore < 50 && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Focus dropping!
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Face Status</p>
                        <p className={`font-medium text-sm ${faceDetection.isFaceDetected ? "text-success" : "text-destructive"}`}>
                          {faceDetection.isFaceDetected ? "✓ Detected" : "✗ Not Found"}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Gaze Direction</p>
                        <p className="font-medium text-sm capitalize">{faceDetection.gazeDirection}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Total Distractions</p>
                      <p className="text-2xl font-bold text-destructive">{distractionCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isSessionActive && (
              <>
                <Card className="shadow-card animate-bounce-in bg-gradient-to-br from-accent/10 to-primary/10 border-2 border-accent/20">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-accent animate-wiggle" />
                          Study Material Tracker
                        </CardTitle>
                        <CardDescription>
                          Select an existing material or create a new one
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/materials")}
                        className="gap-2 animate-pulse-glow"
                      >
                        <BookOpen className="w-4 h-4" />
                        Manage Materials
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {existingMaterials.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="existingMaterial">Select Existing Material</Label>
                        <Select value={selectedMaterialId} onValueChange={(value) => {
                          setSelectedMaterialId(value);
                          if (value === "new") {
                            setSelectedMaterialId("");
                            setMaterialName("");
                          }
                        }}>
                          <SelectTrigger id="existingMaterial">
                            <SelectValue placeholder="Choose from your materials..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">None (create new)</SelectItem>
                            {existingMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or create new</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="materialCategory">Category</Label>
                      <Select 
                        value={materialCategory} 
                        onValueChange={setMaterialCategory}
                        disabled={!!selectedMaterialId}
                      >
                        <SelectTrigger id="materialCategory">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Languages">Languages</SelectItem>
                          <SelectItem value="Social Studies">Social Studies</SelectItem>
                          <SelectItem value="Arts">Arts</SelectItem>
                          <SelectItem value="Programming">Programming</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="materialName">Material / Topic Name</Label>
                      <Input
                        id="materialName"
                        placeholder="e.g., Calculus Chapter 5, Spanish Verbs..."
                        value={materialName}
                        onChange={(e) => {
                          setMaterialName(e.target.value);
                          if (e.target.value) {
                            setSelectedMaterialId("");
                          }
                        }}
                        disabled={!!selectedMaterialId}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Ready to Focus?
                    </CardTitle>
                    <CardDescription>
                      Enter your material above, then start your session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <p>Make sure your camera is working</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <p>Position your face in center of frame</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <p>Look directly at the screen for best results</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <p>System tracks your focus every second</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <p>Turn off notifications for max focus</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Dashboard;