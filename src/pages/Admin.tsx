import { useEffect, useMemo, useState } from "react";
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
import { Phone, Mail, Calendar, Car, IdCard, FileText, AlertTriangle, ImageOff } from "lucide-react";

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  postal_code: string;
  address: string;
  phone: string | null;
  id_number: string | null;
  license_number: string | null;
  license_expiry: string | null;
  years_driving: number | null;
  vehicle_make_model: string;
  vehicle_plate: string;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_seats: number | null;
  bio: string | null;
  profile_photo_path: string | null;
  vehicle_photo_path: string | null;
  proof_of_address_path: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewer_notes: string | null;
}

interface Postal { postal_code: string; area_name: string; }
interface RiderRow { id: string; full_name: string | null; phone: string | null; postal_code: string | null; created_at: string; }

type Filter = "pending" | "approved" | "rejected" | "all";

function DocPreview({ path, label }: { path: string | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    supabase.storage.from("driver-documents").createSignedUrl(path, 60 * 30).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data?.signedUrl) setError(true);
      else setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);

  if (!path) {
    return (
      <div className="rounded-xl border border-dashed border-border p-3 text-center">
        <ImageOff className="size-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-[10px] font-mono uppercase text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">Not uploaded</p>
      </div>
    );
  }

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-border overflow-hidden bg-secondary/40 hover:border-primary transition-colors group"
    >
      <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-2">
            <ImageOff className="size-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Cannot load</p>
          </div>
        ) : url ? (
          <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <p className="text-[10px] font-mono uppercase text-muted-foreground px-2 py-1.5 text-center">{label}</p>
    </a>
  );
}

export default function Admin() {
  const { user, roles } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [postals, setPostals] = useState<Postal[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newArea, setNewArea] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("pending");
  const [stats, setStats] = useState<{ riders: number; drivers: number; admins: number; profiles: number } | null>(null);
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [showRiders, setShowRiders] = useState(false);
  const isAdmin = roles.includes("admin");

  const load = async () => {
    const [a, p, rolesRes, profilesRes, profilesList] = await Promise.all([
      supabase.from("driver_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("approved_postal_codes").select("*").order("postal_code"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id, full_name, phone, postal_code, created_at").order("created_at", { ascending: false }),
    ]);
    setApps((a.data ?? []) as Application[]);
    setPostals((p.data ?? []) as Postal[]);
    const r = (rolesRes.data ?? []) as { user_id: string; role: string }[];
    const uniq = (role: string) => new Set(r.filter(x => x.role === role).map(x => x.user_id)).size;
    setStats({
      riders: uniq("rider"),
      drivers: uniq("driver"),
      admins: uniq("admin"),
      profiles: profilesRes.count ?? 0,
    });
    const riderIds = new Set(r.filter(x => x.role === "rider").map(x => x.user_id));
    setRiders(((profilesList.data ?? []) as RiderRow[]).filter(pr => riderIds.has(pr.id)));
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const counts = useMemo(() => ({
    pending: apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
    all: apps.length,
  }), [apps]);

  const visible = useMemo(
    () => filter === "all" ? apps : apps.filter(a => a.status === filter),
    [apps, filter]
  );

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

  const isLicenseExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const FilterChip = ({ value, label, count }: { value: Filter; label: string; count: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
        filter === value
          ? "bg-gradient-to-r from-primary to-pulse text-primary-foreground shadow-elevated"
          : "bg-secondary text-muted-foreground hover:bg-accent"
      }`}
    >
      {label} <span className="opacity-70 ml-1">{count}</span>
    </button>
  );

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display font-light leading-[0.95] tracking-tight text-3xl mb-10">Admin.</h1>

        {/* User stats */}
        <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "profiles", label: "Total users", value: stats?.profiles ?? "—" },
            { key: "riders", label: "Riders", value: stats?.riders ?? "—" },
            { key: "drivers", label: "Drivers", value: stats?.drivers ?? "—" },
            { key: "admins", label: "Admins", value: stats?.admins ?? "—" },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => s.key === "riders" && setShowRiders(v => !v)}
              className={`surface rounded-2xl border border-border p-5 text-left transition-colors ${s.key === "riders" ? "hover:border-primary cursor-pointer" : "cursor-default"}`}
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="font-display text-3xl mt-1">{s.value}</p>
              {s.key === "riders" && <p className="text-[10px] text-muted-foreground mt-1">{showRiders ? "Hide list" : "Tap to view"}</p>}
            </button>
          ))}
        </section>

        {showRiders && (
          <section className="mb-10 surface rounded-2xl border border-border p-5">
            <h2 className="font-display text-lg mb-4">Registered riders ({riders.length})</h2>
            <div className="grid gap-2">
              {riders.map(r => (
                <div key={r.id} className="flex items-center justify-between border border-border rounded-xl px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{r.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {r.phone || "no phone"} · {r.postal_code || "—"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {riders.length === 0 && <p className="text-sm text-muted-foreground">No riders yet.</p>}
            </div>
          </section>
        )}

        <SOSAlertsPanel />

        <CommissionDashboard />

        <section className="mb-12">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <h2 className="font-display text-xl">Driver applications</h2>
            <div className="flex gap-2 flex-wrap">
              <FilterChip value="pending" label="Pending" count={counts.pending} />
              <FilterChip value="approved" label="Approved" count={counts.approved} />
              <FilterChip value="rejected" label="Rejected" count={counts.rejected} />
              <FilterChip value="all" label="All" count={counts.all} />
            </div>
          </div>

          <div className="grid gap-5">
            {visible.map(app => {
              const expired = isLicenseExpired(app.license_expiry);
              return (
                <div key={app.id} className="surface rounded-2xl border border-border p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    <div>
                      <h3 className="font-display text-xl">{app.full_name}</h3>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        Applied {new Date(app.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                      app.status === "pending" ? "bg-primary/10 text-primary border border-primary/30"
                      : app.status === "approved" ? "bg-pulse/10 text-pulse border border-pulse/30"
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                    }`}>{app.status}</span>
                  </div>

                  {/* Expiry warning */}
                  {expired && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      <AlertTriangle className="size-4 shrink-0" />
                      Driver's license expired on {new Date(app.license_expiry!).toLocaleDateString()}
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
                    <div className="flex items-start gap-2">
                      <Phone className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Phone</p>
                        {app.phone ? <a href={`tel:${app.phone}`} className="text-primary hover:underline">{app.phone}</a> : <span className="text-muted-foreground">—</span>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Address</p>
                        <p>{app.address}</p>
                        <p className="text-xs text-muted-foreground font-mono">Postal: {app.postal_code}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <IdCard className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">ID number</p>
                        <p className="font-mono">{app.id_number ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Driver's license</p>
                        <p className="font-mono">{app.license_number ?? "—"}</p>
                        {app.license_expiry && (
                          <p className={`text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                            Expires {new Date(app.license_expiry).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Years driving</p>
                        <p>{app.years_driving ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Car className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-muted-foreground">Vehicle</p>
                        <p>{app.vehicle_make_model}</p>
                        <p className="text-xs text-muted-foreground">
                          {[app.vehicle_year, app.vehicle_color, app.vehicle_seats && `${app.vehicle_seats} seats`].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs font-mono text-primary">{app.vehicle_plate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Uploaded documents</p>
                    <div className="grid grid-cols-3 gap-3">
                      <DocPreview path={app.profile_photo_path} label="Profile photo" />
                      <DocPreview path={app.vehicle_photo_path} label="Vehicle photo" />
                      <DocPreview path={app.proof_of_address_path} label="Proof of address" />
                    </div>
                  </div>

                  {/* Bio */}
                  {app.bio && (
                    <div className="mt-5 p-4 rounded-xl bg-secondary/40">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Bio</p>
                      <p className="text-sm italic text-foreground/80">"{app.bio}"</p>
                    </div>
                  )}

                  {/* Existing reviewer notes for non-pending */}
                  {app.status !== "pending" && app.reviewer_notes && (
                    <div className="mt-4 p-4 rounded-xl border border-border">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Reviewer notes</p>
                      <p className="text-sm">{app.reviewer_notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {app.status === "pending" && (
                    <div className="space-y-3 mt-5 pt-5 border-t border-border">
                      <Textarea
                        placeholder="Reviewer notes (optional — shown to applicant if rejected)"
                        value={notesById[app.id] ?? ""}
                        onChange={e => setNotesById({ ...notesById, [app.id]: e.target.value })}
                        className="bg-input border-border resize-none" rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => review(app.id, "approved")} className="bg-gradient-to-r from-primary to-pulse text-primary-foreground hover:opacity-90 flex-1">
                          Approve driver
                        </Button>
                        <Button onClick={() => review(app.id, "rejected")} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="surface rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No {filter === "all" ? "" : filter} applications.</p>
              </div>
            )}
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
