import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Save, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [nama, setNama] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setNama(data.nama);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nama })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan perubahan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil!",
        description: "Profil berhasil diperbarui",
      });
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Profil Saya</h1>
              <p className="text-sm text-muted-foreground">Kelola informasi akun kamu</p>
            </div>
          </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Update nama dan informasi pribadi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <div className="flex gap-2">
                <User className="w-5 h-5 text-muted-foreground mt-2" />
                <Input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama kamu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Mail className="w-5 h-5 text-muted-foreground mt-2" />
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email tidak dapat diubah
              </p>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </CardContent>
        </Card>

          <Card className="shadow-glow bg-gradient-primary text-white border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Tips Fokus Maksimal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/95">
              <p className="flex items-start gap-2">
                <span>📵</span>
                <span>Matiin notif HP atau pake mode fokus/DND saat belajar</span>
              </p>
              <p className="flex items-start gap-2">
                <span>🎧</span>
                <span>Coba dengerin lo-fi, classical, atau white noise buat bantu konsentrasi</span>
              </p>
              <p className="flex items-start gap-2">
                <span>⏰</span>
                <span>Pakai teknik Pomodoro: 25 menit fokus, 5 menit istirahat. Repeat!</span>
              </p>
              <p className="flex items-start gap-2">
                <span>🌿</span>
                <span>Cari tempat yang terang, sejuk, dan minim gangguan. Window seat is the best!</span>
              </p>
              <p className="flex items-start gap-2">
                <span>💧</span>
                <span>Jangan lupa minum air putih dan snack sehat. Otak butuh energi!</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;