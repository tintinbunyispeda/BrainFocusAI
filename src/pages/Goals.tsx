import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Award, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

interface Goal {
  id: string;
  user_id: string;
  type: string;
  target_value: number;
  current_value: number;
  period: string;
  created_at: string;
}

const Goals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyTarget, setDailyTarget] = useState("60");
  const [weeklyTarget, setWeeklyTarget] = useState("300");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadGoals();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const loadGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Type assertion to handle the types until they regenerate
    const { data } = await supabase
      .from("study_goals")
      .select("*")
      .eq("user_id", user.id) as any;

    if (data) {
      setGoals(data as Goal[]);
    }
    setLoading(false);
  };

  const createGoal = async (type: string, targetValue: number, period: string) => {
    if (!user) return;

    // Type assertion to handle the types until they regenerate
    const { error } = await (supabase
      .from("study_goals")
      .insert({
        user_id: user.id,
        type,
        target_value: targetValue,
        current_value: 0,
        period,
      }) as any);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Goal created successfully",
      });
      loadGoals();
    }
  };

  const getGoalProgress = (goal: Goal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              Study Goals
            </h1>
            <p className="text-muted-foreground">Set and track your focus targets</p>
          </div>

          {/* Create New Goals */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-card border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Daily Target
                </CardTitle>
                <CardDescription>Set your daily focus time goal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    placeholder="Minutes"
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">minutes/day</span>
                </div>
                <Button
                  onClick={() => createGoal("focus_time", parseInt(dailyTarget), "daily")}
                  className="w-full"
                >
                  Set Daily Goal
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card border-2 border-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  Weekly Target
                </CardTitle>
                <CardDescription>Set your weekly focus time goal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={weeklyTarget}
                    onChange={(e) => setWeeklyTarget(e.target.value)}
                    placeholder="Minutes"
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">minutes/week</span>
                </div>
                <Button
                  onClick={() => createGoal("focus_time", parseInt(weeklyTarget), "weekly")}
                  variant="secondary"
                  className="w-full"
                >
                  Set Weekly Goal
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Goals */}
          <Card className="shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-success" />
                Active Goals
              </CardTitle>
              <CardDescription>Track your progress towards your targets</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : goals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No goals set yet</p>
                  <p className="text-sm text-muted-foreground">Create your first goal above to start tracking!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {goals.map((goal) => {
                    const progress = getGoalProgress(goal);
                    const isComplete = progress >= 100;
                    
                    return (
                      <div key={goal.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold capitalize flex items-center gap-2">
                              {goal.period} Goal
                              {isComplete && <span className="text-success">✓</span>}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(goal.current_value)} / {formatTime(goal.target_value)}
                            </p>
                          </div>
                          <span className={`text-2xl font-bold ${isComplete ? 'text-success' : 'text-primary'}`}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        {isComplete && (
                          <p className="text-sm text-success flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            Goal achieved! Great job! 🎉
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Motivational Tips */}
          <Card className="shadow-card bg-gradient-primary text-white border-0">
            <CardHeader>
              <CardTitle className="text-white">💡 Goal Setting Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-white/95">
              <p className="flex items-start gap-2">
                <span>🎯</span>
                <span>Start small - 25 minutes daily is better than unrealistic targets</span>
              </p>
              <p className="flex items-start gap-2">
                <span>📈</span>
                <span>Gradually increase your goals as you build the habit</span>
              </p>
              <p className="flex items-start gap-2">
                <span>⏰</span>
                <span>Study at the same time daily to build consistency</span>
              </p>
              <p className="flex items-start gap-2">
                <span>🏆</span>
                <span>Celebrate small wins - every session counts!</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Goals;
