import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  ride_id: string;
  triggered_by: string;
  triggered_role: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  resolved: boolean;
  created_at: string;
  resolution_notes: string | null;
}

interface Profile { id: string; full_name: string | null; phone: string | null; }

export function SOSAlertsPanel() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("sos_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data ?? []) as Alert[];
    setAlerts(list);

    const ids = Array.from(new Set(list.map(a => a.triggered_by)));
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);
      setProfiles(Object.fromEntries((ps ?? []).map((p: any) => [p.id, p])));
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-sos")
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, () => {
        load();
        toast.error("🚨 New SOS alert received", { duration: 10000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const resolve = async (id: string) => {
    const { error } = await supabase.from("sos_alerts").update({
      resolved: true,
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes[id] || null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Alert marked resolved"); load(); }
  };

  const unresolved = alerts.filter(a => !a.resolved);

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl mb-4 flex items-center gap-2">
        <ShieldAlert className="size-5 text-destructive" />
        Emergency alerts
        {unresolved.length > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-destructive text-destructive-foreground animate-pulse">
            {unresolved.length} ACTIVE
          </span>
        )}
      </h2>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No SOS alerts. All clear.</p>
      ) : (
        <div className="grid gap-4">
          {alerts.map(alert => {
            const p = profiles[alert.triggered_by];
            const mapsUrl = alert.latitude && alert.longitude
              ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
              : null;
            return (
              <div
                key={alert.id}
                className={`surface rounded-2xl border p-5 ${alert.resolved ? "border-border opacity-70" : "border-destructive/50 bg-destructive/5"}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-lg">
                      {p?.full_name ?? "Unknown user"}{" "}
                      <span className="text-xs font-mono uppercase text-muted-foreground">({alert.triggered_role})</span>
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                    {p?.phone && (
                      <a href={`tel:${p.phone}`} className="text-sm text-primary underline mt-1 inline-block">
                        📞 {p.phone}
                      </a>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase ${alert.resolved ? "bg-muted text-muted-foreground" : "bg-destructive text-destructive-foreground"}`}>
                    {alert.resolved ? "Resolved" : "Active"}
                  </span>
                </div>

                {alert.message && (
                  <p className="text-sm italic text-muted-foreground mb-3">"{alert.message}"</p>
                )}

                <p className="text-xs font-mono text-muted-foreground mb-3">
                  Ride: {alert.ride_id.slice(0, 8)}…
                </p>

                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline mb-3"
                  >
                    <MapPin className="size-4" /> View location <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No location captured.</p>
                )}

                {!alert.resolved && (
                  <div className="space-y-3 mt-3">
                    <Textarea
                      placeholder="Resolution notes (what action was taken?)"
                      value={notes[alert.id] ?? ""}
                      onChange={e => setNotes({ ...notes, [alert.id]: e.target.value })}
                      className="bg-input border-border resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={() => resolve(alert.id)}
                      className="bg-pulse text-pulse-foreground hover:bg-pulse/90"
                    >
                      Mark resolved
                    </Button>
                  </div>
                )}

                {alert.resolved && alert.resolution_notes && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    Notes: {alert.resolution_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
