import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Edit2, Target, TrendingUp, Clock, Award } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";

interface StudyMaterial {
  id: string;
  name: string;
  category: string;
  notes: string | null;
  target_hours: number;
  progress_percentage: number;
  total_focus_score: number;
  total_duration: number;
  total_sessions: number;
  created_at: string;
}

const Materials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Mathematics",
    notes: "",
    target_hours: 10,
  });

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
      loadMaterials();
    }
  }, [user]);

  const loadMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("study_materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load materials",
        variant: "destructive",
      });
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a material name",
        variant: "destructive",
      });
      return;
    }

    if (editingMaterial) {
      const { error } = await supabase
        .from("study_materials")
        .update({
          name: formData.name,
          category: formData.category,
          notes: formData.notes,
          target_hours: formData.target_hours,
        })
        .eq("id", editingMaterial.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update material",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success! 🎉",
        description: "Material updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("study_materials")
        .insert({
          user_id: user.id,
          name: formData.name,
          category: formData.category,
          notes: formData.notes,
          target_hours: formData.target_hours,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add material",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success! 🎉",
        description: "Material added successfully",
      });
    }

    setIsAddDialogOpen(false);
    setEditingMaterial(null);
    setFormData({ name: "", category: "Mathematics", notes: "", target_hours: 10 });
    loadMaterials();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("study_materials")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete material",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: "Material removed successfully",
    });
    loadMaterials();
  };

  const handleEdit = (material: StudyMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      notes: material.notes || "",
      target_hours: material.target_hours,
    });
    setIsAddDialogOpen(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getAverageFocus = (material: StudyMaterial) => {
    if (material.total_sessions === 0) return 0;
    return Math.round(material.total_focus_score / material.total_sessions);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Mathematics: "bg-gradient-primary",
      Science: "bg-gradient-secondary",
      Languages: "bg-gradient-accent",
      "Social Studies": "bg-gradient-success",
      Arts: "bg-gradient-fun",
      Programming: "bg-info",
      Other: "bg-warning",
    };
    return colors[category] || "bg-gradient-primary";
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-fun bg-clip-text text-transparent animate-bounce-in">
                Study Materials 📚
              </h1>
              <p className="text-muted-foreground mt-2">
                Track all your study materials and progress in one place
              </p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="shadow-colorful animate-pulse-glow"
                  onClick={() => {
                    setEditingMaterial(null);
                    setFormData({ name: "", category: "Mathematics", notes: "", target_hours: 10 });
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingMaterial ? "Edit Material" : "Add New Material"}</DialogTitle>
                  <DialogDescription>
                    {editingMaterial 
                      ? "Update your study material details" 
                      : "Create a new study material to track"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Material Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Calculus I, Spanish Grammar, etc."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
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
                  <div>
                    <Label htmlFor="target_hours">Target Hours</Label>
                    <Input
                      id="target_hours"
                      type="number"
                      min="1"
                      value={formData.target_hours}
                      onChange={(e) => setFormData({ ...formData, target_hours: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes, goals, or reminders..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full shadow-glow">
                    {editingMaterial ? "Update Material" : "Add Material"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Materials Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted" />
                  <CardContent className="space-y-3 mt-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : materials.length === 0 ? (
            <Card className="text-center py-16 animate-scale-in">
              <CardContent>
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4 animate-float" />
                <h3 className="text-xl font-semibold mb-2">No materials yet! 📖</h3>
                <p className="text-muted-foreground mb-6">
                  Start by adding your first study material
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Material
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material, index) => (
                <Card 
                  key={material.id} 
                  className="group hover:shadow-colorful transition-all duration-300 hover:-translate-y-2 animate-scale-in border-2 border-primary/20"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className={`${getCategoryColor(material.category)} text-white rounded-t-lg`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{material.name}</CardTitle>
                        <CardDescription className="text-white/90">{material.category}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white hover:bg-white/20"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white hover:bg-white/20"
                          onClick={() => handleDelete(material.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-primary" />
                          Progress
                        </span>
                        <span className="font-semibold text-primary">{material.progress_percentage}%</span>
                      </div>
                      <Progress value={material.progress_percentage} className="h-3" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          Study Time
                        </div>
                        <div className="font-bold text-primary">
                          {formatDuration(material.total_duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          of {material.target_hours}h target
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-3 rounded-lg border border-accent/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="w-3 h-3" />
                          Avg Focus
                        </div>
                        <div className="font-bold text-accent">
                          {getAverageFocus(material)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {material.total_sessions} sessions
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {material.notes && (
                      <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-muted-foreground line-clamp-2">{material.notes}</p>
                      </div>
                    )}

                    {/* Achievement Badge */}
                    {material.progress_percentage >= 100 && (
                      <div className="flex items-center justify-center gap-2 bg-gradient-success text-white p-2 rounded-lg animate-bounce-in">
                        <Award className="w-4 h-4" />
                        <span className="text-sm font-semibold">Completed! 🎉</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tips Card */}
          <Card className="border-2 border-primary/20 shadow-card animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary animate-wiggle" />
                Material Tracking Tips 💡
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-primary">📊 Track Everything</p>
                <p className="text-muted-foreground">
                  Add all your study materials to get a complete overview of your learning journey
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-accent">🎯 Set Realistic Goals</p>
                <p className="text-muted-foreground">
                  Set achievable target hours for each material based on your schedule
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-secondary">📝 Add Notes</p>
                <p className="text-muted-foreground">
                  Use the notes section to track key topics, deadlines, or study strategies
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-warning">🔥 Stay Consistent</p>
                <p className="text-muted-foreground">
                  Study sessions for each material are automatically tracked during your sessions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Materials;
