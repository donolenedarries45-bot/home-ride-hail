import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_role: "rider" | "driver";
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Props {
  rideId: string;
  userId: string;
  myRole: "rider" | "driver";
}

export function RideChat({ rideId, userId, myRole }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load + subscribe
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("ride_messages")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const msgs = (data ?? []) as Message[];
      setMessages(msgs);
      setUnread(msgs.filter(m => m.sender_role !== myRole && !m.read_at).length);
    };
    load();

    const channel = supabase
      .channel(`ride-chat-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages(prev => [...prev, m]);
          if (m.sender_role !== myRole) {
            if (open) markRead([m.id]);
            else setUnread(u => u + 1);
          }
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [rideId, myRole, open]);

  // mark unread as read when opened
  useEffect(() => {
    if (!open) return;
    const ids = messages.filter(m => m.sender_role !== myRole && !m.read_at).map(m => m.id);
    if (ids.length) markRead(ids);
    setUnread(0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [open, messages.length]);

  const markRead = async (ids: string[]) => {
    await supabase.from("ride_messages").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("ride_messages").insert({
      ride_id: rideId,
      sender_id: userId,
      sender_role: myRole,
      body,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative w-full h-12 rounded-2xl border-border">
          <MessageCircle className="size-4 mr-2" />
          Chat with {myRole === "rider" ? "driver" : "rider"}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-mono flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="font-display text-lg">Chat</SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground italic mt-8">
              No messages yet. Say hi 👋
            </p>
          ) : messages.map(m => {
            const mine = m.sender_role === myRole;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] font-mono mt-1 opacity-60`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="px-4 py-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-input border-border"
            maxLength={2000}
          />
          <Button type="submit" disabled={!input.trim() || sending} className="bg-primary text-primary-foreground hover:bg-primary-glow">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
