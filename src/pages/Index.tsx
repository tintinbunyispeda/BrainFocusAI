import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Eye, TrendingUp, Play, BarChart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Brain className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Focus Tracking</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
            Tingkatkan Fokus
            <br />
            Belajar Anda
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistem monitoring fokus dengan AI yang membantu mahasiswa belajar lebih efektif melalui deteksi wajah real-time dan analisis mendalam
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow">
              <Play className="w-5 h-5 mr-2" />
              Mulai Sekarang
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="shadow-card hover:shadow-glow transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Deteksi Real-Time</CardTitle>
              <CardDescription>
                AI mendeteksi wajah dan arah pandangan Anda secara real-time menggunakan teknologi MediaPipe
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle>Analisis Mendalam</CardTitle>
              <CardDescription>
                Dapatkan insights tentang pola fokus Anda dengan grafik dan statistik yang detail
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Rekomendasi AI</CardTitle>
              <CardDescription>
                Terima rekomendasi personal dari AI untuk meningkatkan produktivitas belajar Anda
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">Cara Kerja</h2>
        <div className="space-y-8">
          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Mulai Sesi Belajar</h3>
              <p className="text-muted-foreground">
                Klik tombol "Mulai Sesi" dan berikan izin akses kamera untuk memulai monitoring
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">AI Mendeteksi Fokus</h3>
              <p className="text-muted-foreground">
                Sistem AI akan mendeteksi wajah dan arah pandangan Anda secara real-time, memberikan skor fokus setiap detik
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Lihat Laporan & Rekomendasi</h3>
              <p className="text-muted-foreground">
                Setelah sesi selesai, lihat laporan lengkap dengan grafik fokus, statistik, dan rekomendasi AI untuk meningkatkan produktivitas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto shadow-glow bg-gradient-primary text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-white mb-2">Siap Meningkatkan Fokus Belajar?</CardTitle>
            <CardDescription className="text-white/80 text-lg">
              Mulai sekarang dan rasakan perbedaannya
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
              Daftar Gratis
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;