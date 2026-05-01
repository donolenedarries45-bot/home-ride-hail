import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CommissionDashboard } from "@/components/CommissionDashboard";
import { SOSAlertsPanel } from "@/components/SOSAlertsPanel";

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  postal_code: string;
  address: string;
  vehicle_make_model: string;
  vehicle_plate: string;
  bio: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface Postal { postal_code: string; area_name: string; }

export default function Admin() {
  const { user, roles } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [postals, setPostals] = useState<Postal[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newArea, setNewArea] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const isAdmin = roles.includes("admin");

  const load = async () => {
    const [a, p] = await Promise.all([
      supabase.from("driver_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("approved_postal_codes").select("*").order("postal_code"),
    ]);
    setApps((a.data ?? []) as Application[]);
    setPostals((p.data ?? []) as Postal[]);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="font-display text-3xl mb-4">Admin only</h1>
          <p className="text-muted-foreground mb-6">You need the admin role to view this page.</p>
          <p className="text-xs font-mono text-muted-foreground">Your user id: {user.id}</p>
          <p className="text-xs text-muted-foreground mt-2">Grant yourself admin from the database to manage applications.</p>
        </main>
      </div>
    );
  }

  const review = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("driver_applications").update({
      status,
      reviewer_notes: notesById[id] || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Application ${status}`); load(); }
  };

  const addPostal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newArea.trim()) return;
    const { error } = await supabase.from("approved_postal_codes").insert({ postal_code: newCode.trim(), area_name: newArea.trim() });
    if (error) toast.error(error.message); else { setNewCode(""); setNewArea(""); load(); }
  };

  const removePostal = async (code: string) => {
    const { error } = await supabase.from("approved_postal_codes").delete().eq("postal_code", code);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display font-light leading-[0.95] tracking-tight text-3xl mb-10">Admin.</h1>

        <SOSAlertsPanel />

        <CommissionDashboard />

        <section className="mb-12">
          <h2 className="font-display text-xl mb-4">Driver applications <span className="text-muted-foreground text-sm">({apps.filter(a => a.status === "pending").length} pending)</span></h2>
          <div className="grid gap-4">
            {apps.map(app => (
              <div key={app.id} className="surface rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display text-lg">{app.full_name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{app.postal_code} · {app.address}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase ${app.status === "pending" ? "bg-primary/10 text-primary" : app.status === "approved" ? "bg-pulse/10 text-pulse" : "bg-destructive/10 text-destructive"}`}>{app.status}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-muted-foreground text-xs">Vehicle:</span> {app.vehicle_make_model} ({app.vehicle_plate})</div>
                </div>
                {app.bio && <p className="text-sm italic text-muted-foreground mb-4">"{app.bio}"</p>}
                {app.status === "pending" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Reviewer notes (optional)"
                      value={notesById[app.id] ?? ""}
                      onChange={e => setNotesById({ ...notesById, [app.id]: e.target.value })}
                      className="bg-input border-border resize-none" rows={2}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => review(app.id, "approved")} className="bg-pulse text-pulse-foreground hover:bg-pulse/90">Approve</Button>
                      <Button onClick={() => review(app.id, "rejected")} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {apps.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-4">Approved neighborhoods</h2>
          <form onSubmit={addPostal} className="surface rounded-2xl border border-border p-5 mb-4 grid md:grid-cols-3 gap-3">
            <div><Label className="text-[10px] font-mono uppercase text-muted-foreground">Postal code</Label><Input value={newCode} onChange={e => setNewCode(e.target.value)} className="bg-input border-border mt-1" /></div>
            <div><Label className="text-[10px] font-mono uppercase text-muted-foreground">Area name</Label><Input value={newArea} onChange={e => setNewArea(e.target.value)} className="bg-input border-border mt-1" /></div>
            <div className="flex items-end"><Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary-glow">Add</Button></div>
          </form>
          <div className="grid gap-2">
            {postals.map(p => (
              <div key={p.postal_code} className="flex items-center justify-between surface rounded-xl border border-border px-4 py-3">
                <div><span className="font-mono text-sm text-primary">{p.postal_code}</span> <span className="text-muted-foreground"> · {p.area_name}</span></div>
                <Button variant="ghost" size="sm" onClick={() => removePostal(p.postal_code)} className="text-muted-foreground hover:text-destructive">Remove</Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
