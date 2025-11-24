import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Clock, Eye, Award, Activity, HelpCircle, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [materialStats, setMaterialStats] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    avgScore: 0,
    bestDay: "",
    streak: 0,
  });

  useEffect(() => {
    checkAuth();
    loadAnalytics();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get sessions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("mulai", sevenDaysAgo.toISOString())
      .order("mulai", { ascending: true });

    if (sessions) {
      // Process weekly data
      const dayData: { [key: string]: { sessions: number; minutes: number; avgScore: number } } = {};
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      sessions.forEach((session) => {
        const date = new Date(session.mulai);
        const dayName = days[date.getDay()];
        
        if (!dayData[dayName]) {
          dayData[dayName] = { sessions: 0, minutes: 0, avgScore: 0 };
        }
        
        dayData[dayName].sessions += 1;
        dayData[dayName].minutes += Math.floor((session.durasi_efektif || 0) / 60);
        dayData[dayName].avgScore += session.skor_rata || 0;
      });

      const weeklyChartData = days.map((day) => ({
        day,
        sessions: dayData[day]?.sessions || 0,
        minutes: dayData[day]?.minutes || 0,
        score: dayData[day] ? Math.round(dayData[day].avgScore / dayData[day].sessions) : 0,
      }));

      setWeeklyData(weeklyChartData);

      // Calculate monthly stats
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor((s.durasi_efektif || 0) / 60), 0);
      const avgScore = totalSessions > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.skor_rata || 0), 0) / totalSessions)
        : 0;
      
      const bestDayData = Object.entries(dayData).sort(([, a], [, b]) => b.minutes - a.minutes)[0];
      const bestDay = bestDayData ? bestDayData[0] : "N/A";

      // Calculate streak (consecutive days with sessions)
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const hasSession = sessions.some((s) => {
          const sessionDate = new Date(s.mulai);
          return sessionDate.toDateString() === checkDate.toDateString();
        });
        if (hasSession) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      setMonthlyStats({
        totalSessions,
        totalMinutes,
        avgScore,
        bestDay,
        streak,
      });

      // Calculate material-based statistics
      const materialData: { [key: string]: { sessions: number; minutes: number; avgScore: number } } = {};
      
      sessions.forEach((session) => {
        const material = session.material_category || "Unspecified";
        
        if (!materialData[material]) {
          materialData[material] = { sessions: 0, minutes: 0, avgScore: 0 };
        }
        
        materialData[material].sessions += 1;
        materialData[material].minutes += Math.floor((session.durasi_efektif || 0) / 60);
        materialData[material].avgScore += session.skor_rata || 0;
      });

      const materialChartData = Object.entries(materialData).map(([material, data]) => ({
        material,
        sessions: data.sessions,
        minutes: data.minutes,
        avgScore: Math.round(data.avgScore / data.sessions),
      })).sort((a, b) => b.minutes - a.minutes);

      setMaterialStats(materialChartData);
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary" />
              Weekly Analytics
            </h1>
            <p className="text-muted-foreground">Track your progress and discover your study patterns</p>
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm flex items-start gap-2">
                <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <span><strong>How to use this page:</strong> This dashboard shows your weekly study patterns. Use it to identify your most productive days and optimize your study schedule. Higher focus scores mean better concentration!</span>
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">Sessions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{monthlyStats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
                <p className="text-xs text-primary mt-1">Study sessions completed</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary" />
                  <CardTitle className="text-sm">Total Time</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{monthlyStats.totalMinutes}m</p>
                <p className="text-xs text-muted-foreground">Focus time</p>
                <p className="text-xs text-secondary mt-1">Minutes actively studying</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-success" />
                  <CardTitle className="text-sm">Avg Score</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{monthlyStats.avgScore}</p>
                <p className="text-xs text-muted-foreground">Focus quality</p>
                <p className="text-xs text-success mt-1">0-100 scale (higher = better)</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <CardTitle className="text-sm">Best Day</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent">{monthlyStats.bestDay}</p>
                <p className="text-xs text-muted-foreground">Most productive</p>
                <p className="text-xs text-accent mt-1">Day with most focus time</p>
              </CardContent>
            </Card>

            <Card className="shadow-card bg-gradient-primary text-white border-0 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 animate-float">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-white" />
                  <CardTitle className="text-sm text-white">Streak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{monthlyStats.streak} 🔥</p>
                <p className="text-xs text-white/80">Days in a row</p>
                <p className="text-xs text-white/90 mt-1">Consecutive study days</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Session Chart */}
          <Card className="shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Weekly Session Distribution
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Number of study sessions per day - consistency is key for learning!</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Minutes Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Weekly Focus Time
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Total minutes spent studying each day - aim for consistent daily practice</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="minutes"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Score Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Weekly Focus Quality
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Average focus score per day - higher scores indicate better concentration and fewer distractions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 100]} />
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
                    stroke="hsl(var(--success))"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Material-Based Analytics */}
          {materialStats.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  Study Material Breakdown
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>See which subjects you're focusing on most - balance your study time across different materials</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={materialStats}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="material" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {materialStats.map((stat, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm font-medium">{stat.material}</p>
                      <p className="text-xs text-muted-foreground">{stat.sessions} sessions</p>
                      <p className="text-xs text-success">Avg Score: {stat.avgScore}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <Card className="shadow-card bg-gradient-secondary text-white border-0">
            <CardHeader>
              <CardTitle className="text-white">📊 This Week&apos;s Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/95">
              {monthlyStats.streak >= 3 && (
                <p className="flex items-start gap-2 animate-fade-in">
                  <span>🔥</span>
                  <span>Amazing! You&apos;re on a {monthlyStats.streak}-day streak! Consistency builds lasting study habits. Keep it up!</span>
                </p>
              )}
              {monthlyStats.avgScore >= 80 && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <span>⭐</span>
                  <span>Your focus quality is excellent! Average score of {monthlyStats.avgScore} shows you&apos;re studying in the right environment.</span>
                </p>
              )}
              {monthlyStats.totalSessions >= 7 && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <span>💪</span>
                  <span>Consistency is key! You&apos;ve completed {monthlyStats.totalSessions} sessions this week. Daily practice leads to mastery!</span>
                </p>
              )}
              {monthlyStats.bestDay && (
                <p className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
                  <span>📅</span>
                  <span>{monthlyStats.bestDay} is your most productive day. Try scheduling your most important study tasks for {monthlyStats.bestDay}s!</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Analytics;
