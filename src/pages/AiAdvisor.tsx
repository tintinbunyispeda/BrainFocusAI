import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Sparkles, RefreshCcw } from "lucide-react";
import Navbar from "@/components/Navbar";

// --- 1. THE KNOWLEDGE BASE (Questions & Options) ---
// V = Visual, A = Auditory, R = Reading/Writing, K = Kinesthetic
const QUESTIONS = [
  {
    id: 1,
    text: "When you are learning a new skill (like a game or software), what do you prefer?",
    options: [
      { label: "Look at diagrams, screenshots, or pictures", type: "V" },
      { label: "Talk to someone who knows how to do it", type: "A" },
      { label: "Read the written instructions or manual", type: "R" },
      { label: "Start clicking and figuring it out by doing", type: "K" },
    ],
  },
  {
    id: 2,
    text: "You are planning a holiday for a group. You want some feedback on the plan. You would:",
    options: [
      { label: "Show them photos and maps of the location", type: "V" },
      { label: "Describe the plan and discuss it with them", type: "A" },
      { label: "Send them the itinerary and details in writing", type: "R" },
      { label: "Describe some of the activities you will be doing", type: "K" },
    ],
  },
  {
    id: 3,
    text: "Before an important exam, how do you study best?",
    options: [
      { label: "Using flashcards with colors and diagrams", type: "V" },
      { label: "Discussing topics with friends or listening to recordings", type: "A" },
      { label: "Re-writing your notes and reading textbooks", type: "R" },
      { label: "Doing past papers and practice questions", type: "K" },
    ],
  },
  {
    id: 4,
    text: "If you need to ask for directions to a new place, you prefer:",
    options: [
      { label: "Someone to draw you a map", type: "V" },
      { label: "Someone to tell you the directions", type: "A" },
      { label: "Someone to write down the street names", type: "R" },
      { label: "Someone to go with you or point the way", type: "K" },
    ],
  },
  {
    id: 5,
    text: "You have a problem with your heart. You would prefer the doctor to:",
    options: [
      { label: "Show you a diagram of what is wrong", type: "V" },
      { label: "Describe what is wrong", type: "A" },
      { label: "Give you a pamphlet or article to read", type: "R" },
      { label: "Use a plastic model to show what is happening", type: "K" },
    ],
  },
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Scores = {
  V: number;
  A: number;
  R: number;
  K: number;
};

const AiAdvisor = () => {
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Study Style Expert System. I will ask you 5 questions to accurately determine your learning style. \n\nPlease select the option that best fits you.",
    },
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Scores>({ V: 0, A: 0, R: 0, K: 0 });
  const [isThinking, setIsThinking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking]);

  // --- LOGIC: HANDLE OPTION CLICK ---
  const handleOptionClick = (optionLabel: string, type: string) => {
    // 1. Add User Response to Chat
    const userMsg: Message = { role: "user", content: optionLabel };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // 2. Update Score
    const newScores = { ...scores, [type as keyof Scores]: scores[type as keyof Scores] + 1 };
    setScores(newScores);

    // 3. Process Next Step (Simulate delay)
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < QUESTIONS.length) {
        // Ask Next Question
        const nextQ = QUESTIONS[nextIndex];
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: nextQ.text },
        ]);
        setCurrentQuestionIndex(nextIndex);
      } else {
        // FINISHED: Calculate Result
        showResult(newScores);
      }
      setIsThinking(false);
    }, 800);
  };

  // --- LOGIC: CALCULATE & SHOW RESULT ---
  const showResult = (finalScores: Scores) => {
    // Find the highest score
    const winningType = Object.keys(finalScores).reduce((a, b) =>
      finalScores[a as keyof Scores] > finalScores[b as keyof Scores] ? a : b
    );

    let styleName = "";
    let advice = "";

    switch (winningType) {
      case "V":
        styleName = "Visual Learner (Visual)";
        advice = "• Use mind maps, charts, and diagrams.\n• Color-code your notes.\n• Watch video tutorials.";
        break;
      case "A":
        styleName = "Auditory Learner (Listening)";
        advice = "• Record lectures and listen to them again.\n• Discuss topics with friends.\n• Read your notes out loud.";
        break;
      case "R":
        styleName = "Read/Write Learner";
        advice = "• Write lists and bullet points.\n• Read textbooks and rewrite notes.\n• Use headings and subheadings.";
        break;
      case "K":
        styleName = "Kinesthetic Learner (Doing)";
        advice = "• Use real-life examples and case studies.\n• Do practice exams and past papers.\n• Take frequent breaks to move around.";
        break;
    }

    const resultMsg = `Analysis Complete!\n\nYour dominant learning style is: **${styleName}**\n\n**Recommended Strategy:**\n${advice}`;
    
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: resultMsg },
    ]);
    setIsFinished(true);
  };

  // --- RESET FUNCTION ---
  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Session reset. Let's find your learning style again!",
      },
      {
        role: "assistant",
        content: QUESTIONS[0].text, // Ask Q1 immediately
      },
    ]);
    setScores({ V: 0, A: 0, R: 0, K: 0 });
    setCurrentQuestionIndex(0);
    setIsFinished(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container max-w-4xl mx-auto py-8 px-4 flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col h-[85vh] border-primary/20 shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Expert System Advisor
              </div>
              {isFinished && (
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RefreshCcw className="w-4 h-4" /> Restart
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden relative">
            {/* 1. CHAT HISTORY AREA */}
            <ScrollArea className="flex-1 p-4 pb-32"> {/* Added padding-bottom for the fixed options */}
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {message.role === "user" ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-muted"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isThinking && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs ml-12 animate-pulse">
                    Thinking...
                  </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* 2. INTERACTION AREA (FIXED BOTTOM) */}
            <div className="p-4 bg-background border-t min-h-[160px]">
              {!isFinished && !isThinking ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {QUESTIONS[currentQuestionIndex].options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="h-auto py-3 px-4 text-left justify-start hover:bg-primary/10 hover:text-primary hover:border-primary transition-all whitespace-normal"
                      onClick={() => handleOptionClick(option.label, option.type)}
                    >
                      <span className="font-bold mr-3 text-muted-foreground opacity-50">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : isFinished ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-muted-foreground text-sm">
                    Analysis complete. Click "Restart" above to try again.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiAdvisor;