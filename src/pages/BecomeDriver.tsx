import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  postal_code: z.string().trim().min(3).max(10),
  address: z.string().trim().min(5).max(200),
  vehicle_make_model: z.string().trim().min(2).max(80),
  vehicle_plate: z.string().trim().min(2).max(20),
  bio: z.string().trim().max(400).optional(),
});

interface Application {
  id: string;
  status: "pending" | "approved" | "rejected";
  postal_code: string;
  reviewer_notes: string | null;
}

export default function BecomeDriver() {
  const { user } = useAuth();
  const [postalCodes, setPostalCodes] = useState<{ postal_code: string; area_name: string }[]>([]);
  const [existing, setExisting] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", postal_code: "", address: "", vehicle_make_model: "", vehicle_plate: "", bio: "" });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("approved_postal_codes").select("postal_code, area_name"),
      supabase.from("driver_applications").select("id, status, postal_code, reviewer_notes").eq("user_id", user.id).maybeSingle(),
    ]).then(([pc, app]) => {
      setPostalCodes(pc.data ?? []);
      setExisting(app.data as Application ?? null);
      setLoading(false);
    });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error, data } = await supabase
      .from("driver_applications")
      .insert({ user_id: user!.id, ...parsed.data })
      .select("id, status, postal_code, reviewer_notes")
      .single();
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { setExisting(data as Application); toast.success("Application submitted!"); }
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-5xl font-light tracking-tight mb-2">Drive with Lantern.</h1>
        <p className="text-muted-foreground mb-10">Two checks: your zip code must be in our network, then a human approves you.</p>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : existing ? (
          <div className="surface rounded-3xl border border-border p-8 glow-border">
            {existing.status === "pending" && (
              <div className="text-center py-6">
                <Clock className="size-12 text-primary mx-auto mb-4" />
                <h2 className="font-display text-2xl mb-2">Under review</h2>
                <p className="text-muted-foreground">An admin is reviewing your application for <span className="text-foreground font-mono">{existing.postal_code}</span>. We'll let you know soon.</p>
              </div>
            )}
            {existing.status === "approved" && (
              <div className="text-center py-6">
                <CheckCircle2 className="size-12 text-pulse mx-auto mb-4" />
                <h2 className="font-display text-2xl mb-2">You're in!</h2>
                <p className="text-muted-foreground">Welcome to the network. Head to <a href="/driver" className="text-primary underline">your driver dashboard</a>.</p>
              </div>
            )}
            {existing.status === "rejected" && (
              <div className="text-center py-6">
                <XCircle className="size-12 text-destructive mx-auto mb-4" />
                <h2 className="font-display text-2xl mb-2">Application not approved</h2>
                {existing.reviewer_notes && <p className="text-muted-foreground italic">"{existing.reviewer_notes}"</p>}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="surface rounded-3xl border border-border p-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Full legal name"><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="bg-input border-border" /></Field>
              <Field label="Neighborhood">
                <Select value={form.postal_code} onValueChange={v => setForm({ ...form, postal_code: v })}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select your zip" /></SelectTrigger>
                  <SelectContent>
                    {postalCodes.map(p => <SelectItem key={p.postal_code} value={p.postal_code}>{p.area_name} · {p.postal_code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Home address"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-input border-border" /></Field>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Vehicle (make & model)"><Input value={form.vehicle_make_model} onChange={e => setForm({ ...form, vehicle_make_model: e.target.value })} placeholder="2019 Honda Civic" className="bg-input border-border" /></Field>
              <Field label="License plate"><Input value={form.vehicle_plate} onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} className="bg-input border-border" /></Field>
            </div>
            <Field label="Tell your neighbors about yourself"><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="I've lived on Oak Street for 9 years..." rows={3} className="bg-input border-border resize-none" /></Field>

            <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold rounded-2xl">
              {submitting ? "Submitting..." : "Submit application"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
