import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { LogOut, Play, Square, Brain, Eye, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

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
    <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Focus Tracker</h1>
              <p className="text-sm text-muted-foreground">
                Halo, {user?.user_metadata?.nama || user?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Live Monitoring</CardTitle>
                    <CardDescription>
                      Kamera akan mendeteksi wajah dan arah pandangan Anda
                    </CardDescription>
                  </div>
                  {isSessionActive ? (
                    <Button onClick={handleEndSession} variant="destructive" size="lg">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button onClick={handleStartSession} size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      Mulai Sesi
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
                  {!isSessionActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <p className="text-white text-lg">Mulai sesi untuk mengaktifkan kamera</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Focus Graph */}
            {isSessionActive && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Grafik Fokus Real-Time</CardTitle>
                  <CardDescription>Skor fokus Anda selama 60 detik terakhir</CardDescription>
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
                <Card className="shadow-card bg-gradient-primary text-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      <CardTitle className="text-white">Waktu Belajar</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold">{formatTime(elapsedTime)}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      <CardTitle>Status Fokus</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Skor Saat Ini</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-success transition-all"
                            style={{ width: `${faceDetection.focusScore}%` }}
                          />
                        </div>
                        <span className="text-2xl font-bold text-success">
                          {faceDetection.focusScore}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status Wajah</p>
                      <p className="font-medium">
                        {faceDetection.isFaceDetected ? "✓ Terdeteksi" : "✗ Tidak Terdeteksi"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Arah Pandangan</p>
                      <p className="font-medium capitalize">{faceDetection.gazeDirection}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Distraksi</p>
                      <p className="text-2xl font-bold text-destructive">{distractionCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isSessionActive && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Mulai Sesi Belajar</CardTitle>
                  <CardDescription>
                    Klik tombol "Mulai Sesi" untuk memulai monitoring fokus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Pastikan kamera Anda berfungsi</p>
                    <p>• Posisikan wajah di depan kamera</p>
                    <p>• Sistem akan mencatat fokus Anda secara real-time</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;