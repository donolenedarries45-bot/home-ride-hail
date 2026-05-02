import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Star, MessageCircle, Sparkles } from "lucide-react";

const feedbackSchema = z.object({
  category: z.enum(["general", "driver", "app", "safety", "pricing", "suggestion"]),
  rating: z.number().int().min(1).max(5).nullable(),
  message: z.string().trim().min(3, "Please share a bit more").max(1000, "Keep it under 1000 characters"),
});

const CATEGORIES = [
  { value: "suggestion", label: "💡 Suggestion to improve" },
  { value: "driver", label: "🚗 About a driver" },
  { value: "app", label: "📱 App experience" },
  { value: "safety", label: "🛡️ Safety concern" },
  { value: "pricing", label: "💰 Pricing & fares" },
  { value: "general", label: "💬 General comment" },
];

interface FeedbackItem {
  id: string;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState("suggestion");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FeedbackItem[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("customer_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setHistory((data as FeedbackItem[]) ?? []);
  };

  useEffect(() => { loadHistory(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = feedbackSchema.safeParse({ category, rating, message });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("customer_feedback").insert({
      user_id: user!.id,
      category,
      rating,
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thank you! Your feedback helps us improve.");
    setMessage(""); setRating(null); setCategory("suggestion");
    loadHistory();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "var(--gradient-glow)" }} />

      <div className="relative max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-3">
            <Sparkles className="size-3" />
            <span className="text-xs font-mono uppercase tracking-widest">Help us improve</span>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight">Share your thoughts</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Every comment helps us build a safer, better neighborhood ride service.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="surface bg-card rounded-3xl border border-border p-5 space-y-4 shadow-elevated">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">What's it about?</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary/60 border-0 h-12 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Rate your experience (optional)</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className={`size-11 rounded-xl flex items-center justify-center transition-all ${
                    rating != null && n <= rating
                      ? "bg-gradient-to-br from-primary to-pulse text-primary-foreground shadow-elevated scale-105"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                  aria-label={`${n} star${n>1?'s':''}`}
                >
                  <Star className="size-5" fill={rating != null && n <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">Your message</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what we can do better, what you loved, or any ideas you have…"
              className="bg-secondary/60 border-0 resize-none rounded-2xl min-h-[140px]"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/1000</p>
          </div>

          <Button
            type="submit"
            disabled={submitting || message.trim().length < 3}
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-2xl"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </Button>
        </form>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-medium mb-3 flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" />
              Your past feedback
            </h2>
            <div className="space-y-3">
              {history.map(f => (
                <div key={f.id} className="surface bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      {CATEGORIES.find(c => c.value === f.category)?.label ?? f.category}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      f.status === "resolved" ? "bg-pulse/10 text-pulse" :
                      f.status === "reviewed" ? "bg-primary/10 text-primary" :
                      "bg-secondary text-muted-foreground"
                    }`}>{f.status}</span>
                  </div>
                  {f.rating && (
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className="size-3" fill={n <= f.rating! ? "currentColor" : "none"} />
                      ))}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{f.message}</p>
                  {f.admin_response && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Response from team</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.admin_response}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(f.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
