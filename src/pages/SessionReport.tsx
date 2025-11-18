import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, TrendingUp, Eye, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SessionReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [focusDetails, setFocusDetails] = useState<any[]>([]);
  const [distractions, setDistractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    if (!id) return;

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();

    const { data: focusData } = await supabase
      .from("focus_details")
      .select("*")
      .eq("session_id", id)
      .order("detik_ke", { ascending: true });

    const { data: distractionData } = await supabase
      .from("distractions")
      .select("*")
      .eq("session_id", id)
      .order("waktu", { ascending: true });

    setSession(sessionData);
    setFocusDetails(focusData || []);
    setDistractions(distractionData || []);
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Sesi tidak ditemukan</p>
      </div>
    );
  }

  const chartData = focusDetails.map((detail) => ({
    second: detail.detik_ke,
    score: detail.skor,
  }));

  return (
    <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Laporan Sesi Belajar</h1>
            <p className="text-sm text-muted-foreground">{formatDate(session.mulai)}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">Durasi Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatTime(session.durasi_efektif || 0)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <CardTitle className="text-sm">Skor Rata-Rata</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {session.skor_rata?.toFixed(1) || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                <CardTitle className="text-sm">Data Point</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{focusDetails.length}</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <CardTitle className="text-sm">Total Distraksi</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{distractions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Focus Graph */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Grafik Fokus Sepanjang Sesi</CardTitle>
            <CardDescription>Skor fokus Anda dari awal hingga akhir sesi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="second"
                  label={{ value: "Detik", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: "Skor", angle: -90, position: "insideLeft" }}
                />
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

        {/* Distractions List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Riwayat Distraksi</CardTitle>
            <CardDescription>Daftar momen ketika fokus Anda terganggu</CardDescription>
          </CardHeader>
          <CardContent>
            {distractions.length > 0 ? (
              <div className="space-y-2">
                {distractions.map((distraction) => (
                  <div
                    key={distraction.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {distraction.jenis.replace("_", " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(distraction.waktu)}
                      </p>
                    </div>
                    {distraction.durasi && (
                      <span className="text-sm text-muted-foreground">
                        {distraction.durasi}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada distraksi terdeteksi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="shadow-card bg-gradient-primary text-white">
          <CardHeader>
            <CardTitle className="text-white">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-white/90">
            {session.skor_rata >= 80 && (
              <p>✓ Fokus Anda sangat baik! Pertahankan konsistensi ini.</p>
            )}
            {session.skor_rata >= 60 && session.skor_rata < 80 && (
              <p>→ Fokus Anda cukup baik, masih ada ruang untuk peningkatan.</p>
            )}
            {session.skor_rata < 60 && (
              <p>! Fokus Anda perlu ditingkatkan. Coba kurangi distraksi di sesi berikutnya.</p>
            )}
            {distractions.length > 10 && (
              <p>• Terlalu banyak distraksi ({distractions.length}x). Coba buat lingkungan belajar yang lebih kondusif.</p>
            )}
            {session.durasi_efektif > 3600 && (
              <p>• Sesi yang panjang! Jangan lupa istirahat untuk menjaga fokus optimal.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionReport;