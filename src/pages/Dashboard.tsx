import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { Play, Square, Brain, Eye, Activity, AlertTriangle } from "lucide-react";
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
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      if (sessionStartTime) {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);

        // Add focus data point
        setFocusData((prev) => [
          ...prev.slice(-59),
          {
            second: elapsed,
            score: faceDetection.focusScore,
          },
        ]);

        // Save to database
        if (sessionId && faceDetection.isFaceDetected) {
          supabase.from("focus_details").insert({
            session_id: sessionId,
            detik_ke: elapsed,
            skor: faceDetection.focusScore,
            arah_tatapan: faceDetection.gazeDirection,
            status_wajah: "detected",
          }).then();
        } else if (sessionId) {
          supabase.from("focus_details").insert({
            session_id: sessionId,
            detik_ke: elapsed,
            skor: 0,
            arah_tatapan: "unknown",
            status_wajah: "not_detected",
          }).then();

          setDistractionCount((prev) => prev + 1);
          
          supabase.from("distractions").insert({
            session_id: sessionId,
            jenis: "face_not_detected",
            durasi: 1,
          }).then();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime, faceDetection, sessionId]);

  const handleStartSession = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memulai sesi",
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
      title: "Sesi Dimulai",
      description: "Sesi belajar Anda telah dimulai",
    });
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
        description: "Gagal mengakhiri sesi",
        variant: "destructive",
      });
      return;
    }

    setIsSessionActive(false);
    toast({
      title: "Sesi Berakhir",
      description: "Sesi belajar Anda telah disimpan",
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
                Halo, {user?.user_metadata?.nama?.split(" ")[0] || "Sobat"} 👋
              </h1>
              <p className="text-muted-foreground">
                {isSessionActive 
                  ? "Tetap fokus! Kamu lagi hebat nih 🔥" 
                  : "Siap belajar hari ini? Yuk mulai!"}
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
                        Monitoring Live
                      </CardTitle>
                      <CardDescription>
                        AI akan tracking wajah & arah pandangan kamu
                      </CardDescription>
                    </div>
                    {isSessionActive ? (
                      <Button onClick={handleEndSession} variant="destructive" size="lg" className="shadow-glow">
                        <Square className="w-4 h-4 mr-2" />
                        Stop Sesi
                      </Button>
                    ) : (
                      <Button onClick={handleStartSession} size="lg" className="shadow-glow">
                        <Play className="w-4 h-4 mr-2" />
                        Mulai Belajar
                      </Button>
                    )}
                  </div>
                </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover opacity-0"
                    autoPlay
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    width={640}
                    height={480}
                  />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm">
                      <Brain className="w-16 h-16 text-primary mb-4 animate-pulse" />
                      <p className="text-foreground text-lg font-medium">Klik "Mulai Belajar" untuk mulai</p>
                      <p className="text-muted-foreground text-sm mt-2">Pastikan kamera kamu udah nyala ya!</p>
                    </div>
                </div>
              </CardContent>
            </Card>

              {isSessionActive && (
                <Card className="shadow-card border-2 border-accent/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      Grafik Fokus Real-Time
                    </CardTitle>
                    <CardDescription>Tracking skor fokus 60 detik terakhir</CardDescription>
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
                      <CardTitle className="text-white">Waktu Belajar</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-5xl font-bold tabular-nums">{formatTime(elapsedTime)}</p>
                    <p className="text-white/80 text-sm mt-2">
                      {elapsedTime >= 1500 ? "Wow! Udah lama nih, istirahat bentar yuk 😊" : "Tetap semangat!"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-2 border-success/30">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-success" />
                      <CardTitle>Status Fokus Sekarang</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Skor Saat Ini</p>
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
                          Fokus menurun nih!
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Status Wajah</p>
                        <p className={`font-medium text-sm ${faceDetection.isFaceDetected ? "text-success" : "text-destructive"}`}>
                          {faceDetection.isFaceDetected ? "✓ Terdeteksi" : "✗ Tidak Ada"}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Arah Lihat</p>
                        <p className="font-medium text-sm capitalize">{faceDetection.gazeDirection}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Total Distraksi</p>
                      <p className="text-2xl font-bold text-destructive">{distractionCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isSessionActive && (
              <Card className="shadow-card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Yuk Mulai Belajar!
                  </CardTitle>
                  <CardDescription>
                    Klik tombol di atas untuk mulai sesi belajar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <p>Pastikan kamera berfungsi dengan baik</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <p>Posisikan wajah di tengah kamera</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <p>Sistem akan auto-save setiap detik</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <p>Matikan notifikasi untuk fokus maksimal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Dashboard;