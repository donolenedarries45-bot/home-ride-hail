import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone } from "lucide-react";

interface RiderProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export function RiderProfileCard({ riderId }: { riderId: string }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .eq("id", riderId)
        .maybeSingle();
      if (!cancelled) {
        setRider((data as RiderProfile) ?? { id: riderId, full_name: null, avatar_url: null, phone: null });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [riderId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-input/30 p-4 flex items-center gap-4 animate-pulse">
        <div className="size-14 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (!rider) return null;

  const initials = (rider.full_name ?? "?")
    .split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-input/30 p-4">
      <div className="flex items-center gap-4">
        {rider.avatar_url ? (
          <img src={rider.avatar_url} alt={rider.full_name ?? "Rider"} className="size-14 rounded-full object-cover border-2 border-pulse/40" />
        ) : (
          <div className="size-14 rounded-full bg-secondary border-2 border-pulse/40 flex items-center justify-center text-sm font-semibold">
            {initials || <User className="size-5 text-muted-foreground" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Your rider</p>
          <p className="font-display text-lg font-medium truncate">{rider.full_name ?? "Rider"}</p>
          {rider.phone && (
            <a href={`tel:${rider.phone}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-primary">
              <Phone className="size-3" /> {rider.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
