import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, TrendingUp, Eye, AlertCircle, Sparkles, BookOpen, HelpCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";

const SessionReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [focusDetails, setFocusDetails] = useState<any[]>([]);
  const [distractions, setDistractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyType, setStudyType] = useState("visual");
  const [materialClarity, setMaterialClarity] = useState("3");
  const [studyChallenge, setStudyChallenge] = useState("distractions");
  const [reflectionNotes, setReflectionNotes] = useState("");
  const [showInsight, setShowInsight] = useState(false);

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
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReflectionSummary = () => {
    if (!session) return "";
    const score = session.skor_rata || 0;
    let base = "";

    // Learning style insights (VARK)
    if (studyType === "visual") {
      base += "As a Visual learner, you learn best with diagrams, charts, and visual representations. Keep using visual materials! ";
    } else if (studyType === "auditori") {
      base += "As an Auditory learner, listening to lectures and discussions works best for you. Continue using audio resources! ";
    } else if (studyType === "kinestetik") {
      base += "As a Kinesthetic learner, hands-on practice is crucial for you. Keep doing practical exercises! ";
    } else {
      base += "As a Read/Write learner, you excel with written materials. Continue reading and note-taking! ";
    }

    const clarityNum = parseInt(materialClarity);
    if (clarityNum >= 4) {
      base += "You reported high clarity, so start adding spaced review instead of relearning from zero. ";
    } else if (clarityNum === 3) {
      base += "Your understanding is medium – one more focused review session would help. ";
    } else {
      base += "Because the material still feels unclear, focus on concept review before doing more practice. ";
    }

    if (studyChallenge === "distractions") {
      base += "Distractions were the main challenge – try shorter sessions with your phone in another room. ";
    } else if (studyChallenge === "confusion") {
      base += "Confusing material was the main challenge – write down questions to ask a friend or teacher. ";
    } else if (studyChallenge === "energy") {
      base += "Low energy was a problem – experiment with studying earlier or after a short walk. ";
    } else if (studyChallenge === "time") {
      base += "Time was limited – plan a specific time block for this topic in your next study day. ";
    } else {
      base += "Great that you didn't feel big obstacles – focus on staying consistent with this routine. ";
    }

    if (score >= 80) {
      base += "Your focus score was high, so this study method seems to work well for you. Keep using it!";
    } else if (score >= 60) {
      base += "Your focus score was decent – a few tweaks to environment and breaks can boost it further.";
    } else {
      base += "Your focus score was low – combine a simpler study method with a distraction-free environment next time.";
    }

    return base;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading your session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <p>Session not found</p>
      </div>
    );
  }

  const chartData = focusDetails.map((detail) => ({
    second: detail.detik_ke,
    score: detail.skor,
  }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} className="hover:scale-110 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Session Report</h1>
              <p className="text-sm text-muted-foreground">{formatDate(session.mulai)}</p>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          {session.material_name && (
            <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1 md:col-span-4 bg-gradient-to-br from-accent/10 to-primary/10 border-2 border-accent/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <CardTitle className="text-sm">Study Material</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{session.material_name}</p>
                <p className="text-sm text-muted-foreground mt-1">Category: {session.material_category || "Not specified"}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">Total Duration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatTime(session.durasi_efektif || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Time you spent studying</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <CardTitle className="text-sm">Average Score</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {session.skor_rata?.toFixed(1) || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Focus quality: 0-100</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                <CardTitle className="text-sm">Data Points</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{focusDetails.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Measurements taken</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <CardTitle className="text-sm">Total Distractions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{distractions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Times you looked away</p>
            </CardContent>
          </Card>
        </div>

        {/* Focus Graph */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Focus Timeline
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              Your focus score from start to finish. Higher is better! Dips show when you looked away or got distracted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="second"
                  label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: "Focus Score", angle: -90, position: "insideLeft" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  className="drop-shadow-lg"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distractions List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Distraction History</CardTitle>
            <CardDescription>Moments when your focus was interrupted - use this to identify patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {distractions.length > 0 ? (
              <div className="space-y-2">
                {distractions.map((distraction, idx) => {
                  const getDistractionLabel = (type: string) => {
                    const labels: Record<string, { label: string; emoji: string }> = {
                      "looking_down_phone": { label: "Using Phone / Looking Down", emoji: "📱" },
                      "looking_away_left": { label: "Looking Away Left", emoji: "👈" },
                      "looking_away_right": { label: "Looking Away Right", emoji: "👉" },
                      "looking_down": { label: "Looking Down", emoji: "⬇️" },
                      "looking_up": { label: "Looking Up", emoji: "⬆️" },
                      "head_tilted": { label: "Head Tilted", emoji: "🔄" },
                      "face_not_detected": { label: "Face Not Visible", emoji: "👤" },
                    };
                    return labels[type] || { label: type.replace("_", " "), emoji: "⚠️" };
                  };
                  
                  const { label, emoji } = getDistractionLabel(distraction.jenis);
                  
                  return (
                    <div
                      key={distraction.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div>
                        <p className="font-medium">
                          {emoji} {label}
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
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 mx-auto mb-2 text-success opacity-50" />
                <p className="text-muted-foreground">Perfect focus! No distractions detected 🎯</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Style Survey (VARK) */}
        <Card className="shadow-glow border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Discover Your Learning Style 🎓
            </CardTitle>
            <CardDescription>
              Answer these questions to identify how you learn best (VARK Model: Visual, Auditory, Kinesthetic, Read/Write)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                1. When learning something new, you prefer to:
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </label>
              <select
                value={studyType}
                onChange={(e) => setStudyType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="visual">Look at diagrams, charts, or videos (Visual Learner 👁️)</option>
                <option value="auditori">Listen to lectures, podcasts, or discussions (Auditory Learner 👂)</option>
                <option value="kinestetik">Do hands-on activities, experiments, or practice (Kinesthetic Learner ✋)</option>
                <option value="readwrite">Read books, notes, or write summaries (Read/Write Learner 📝)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                💡 Identifying your learning style helps you choose the most effective study methods
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                2. How clear does this material feel now?
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </label>
              <select
                value={materialClarity}
                onChange={(e) => setMaterialClarity(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="1">1 - Still very confusing</option>
                <option value="2">2 - Mostly unclear</option>
                <option value="3">3 - Half clear, half confusing</option>
                <option value="4">4 - Mostly clear</option>
                <option value="5">5 - Very clear and confident</option>
              </select>
              <p className="text-xs text-muted-foreground">
                💡 If still unclear after studying, try a different explanation source or ask for help
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                3. What was your biggest challenge?
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </label>
              <select
                value={studyChallenge}
                onChange={(e) => setStudyChallenge(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="distractions">Distractions (phone, other tabs, people)</option>
                <option value="confusion">Confusing material</option>
                <option value="energy">Low energy / sleepy</option>
                <option value="time">Not enough time</option>
                <option value="none">No major challenge</option>
              </select>
              <p className="text-xs text-muted-foreground">
                💡 Identifying obstacles helps you plan better for next time
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">4. Notes for your next session (optional)</label>
              <Textarea
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Example: Next time I will start with practice questions and put my phone in another room."
                className="min-h-[80px] transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button 
              onClick={() => setShowInsight(true)}
              className="w-full shadow-glow"
              size="lg"
            >
              Submit & Get Your Personalized Insight 🎯
            </Button>

            {showInsight && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30 animate-bounce-in">
                <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  📊 Your Personalized Study Insight
                </p>
                <p className="text-sm leading-relaxed font-medium">
                  {getReflectionSummary()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Insights */}
          <Card className="shadow-glow bg-gradient-primary text-white border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Quick Tips Based on This Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/95">
              {session.skor_rata >= 80 && (
                <p className="flex items-start gap-2 animate-fade-in">
                  <span>🔥</span>
                  <span>Excellent focus! You were locked in. Keep this same environment and routine!</span>
                </p>
              )}
              {session.skor_rata >= 60 && session.skor_rata < 80 && (
                <p className="flex items-start gap-2 animate-fade-in">
                  <span>💪</span>
                  <span>Good session! Try reducing distractions next time to boost your score even higher.</span>
                </p>
              )}
              {session.skor_rata < 60 && (
                <p className="flex items-start gap-2 animate-fade-in">
                  <span>💡</span>
                  <span>Focus was inconsistent. Turn off phone notifications and find a quieter space!</span>
                </p>
              )}
              {distractions.length > 10 && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <span>⚠️</span>
                  <span>You had {distractions.length} distractions! Put your phone in another room and close unneeded tabs.</span>
                </p>
              )}
              {session.durasi_efektif > 3600 && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <span>⏰</span>
                  <span>Amazing endurance - {Math.floor(session.durasi_efektif / 3600)}+ hours! Remember to take 15-min breaks every hour.</span>
                </p>
              )}
              {session.durasi_efektif < 900 && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
                  <span>🎯</span>
                  <span>Short session. Try aiming for at least 25 minutes (1 Pomodoro) for better results!</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SessionReport;
