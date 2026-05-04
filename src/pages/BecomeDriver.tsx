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
import { CheckCircle2, Clock, XCircle, Upload, FileText, X } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  postal_code: z.string().trim().min(3).max(10),
  address: z.string().trim().min(5, "Address is required").max(200),
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  id_number: z.string().trim().min(5, "ID / passport number is required").max(30),
  license_number: z.string().trim().min(3, "Driver's license number is required").max(30),
  license_expiry: z.string().min(1, "License expiry is required"),
  years_driving: z.coerce.number().int().min(0).max(80),
  vehicle_make_model: z.string().trim().min(2).max(80),
  vehicle_plate: z.string().trim().min(2).max(20),
  vehicle_year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  vehicle_color: z.string().trim().min(2).max(30),
  vehicle_seats: z.coerce.number().int().min(1).max(20),
  bio: z.string().trim().max(400).optional(),
});

interface Application {
  id: string;
  status: "pending" | "approved" | "rejected";
  postal_code: string;
  reviewer_notes: string | null;
}

const initialForm = {
  full_name: "",
  postal_code: "",
  address: "",
  phone: "",
  id_number: "",
  license_number: "",
  license_expiry: "",
  years_driving: "",
  vehicle_make_model: "",
  vehicle_plate: "",
  vehicle_year: "",
  vehicle_color: "",
  vehicle_seats: "",
  bio: "",
};

export default function BecomeDriver() {
  const { user } = useAuth();
  const [postalCodes, setPostalCodes] = useState<{ postal_code: string; area_name: string }[]>([]);
  const [existing, setExisting] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState<{ profile?: File; vehicle?: File; address?: File }>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const refetchExisting = async () => {
      const { data } = await supabase
        .from("driver_applications")
        .select("id, status, postal_code, reviewer_notes")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setExisting((data as Application) ?? null);
    };
    Promise.all([
      supabase.from("approved_postal_codes").select("postal_code, area_name"),
      supabase.from("driver_applications").select("id, status, postal_code, reviewer_notes").eq("user_id", user.id).maybeSingle(),
    ]).then(([pc, app]) => {
      if (cancelled) return;
      setPostalCodes(pc.data ?? []);
      setExisting((app.data as Application) ?? null);
      setLoading(false);
    });
    const onFocus = () => refetchExisting();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user]);

  const uploadFile = async (file: File, kind: string): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user!.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("driver-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!files.profile) { toast.error("Please upload a profile photo"); return; }
    if (!files.vehicle) { toast.error("Please upload a vehicle photo"); return; }
    if (!files.address) { toast.error("Please upload proof of address"); return; }

    setSubmitting(true);
    try {
      const [profilePath, vehiclePath, addressPath] = await Promise.all([
        uploadFile(files.profile, "profile"),
        uploadFile(files.vehicle, "vehicle"),
        uploadFile(files.address, "address"),
      ]);

      const insertRow = {
        user_id: user!.id,
        full_name: parsed.data.full_name,
        postal_code: parsed.data.postal_code,
        address: parsed.data.address,
        phone: parsed.data.phone,
        id_number: parsed.data.id_number,
        license_number: parsed.data.license_number,
        license_expiry: parsed.data.license_expiry,
        years_driving: parsed.data.years_driving,
        vehicle_make_model: parsed.data.vehicle_make_model,
        vehicle_plate: parsed.data.vehicle_plate,
        vehicle_year: parsed.data.vehicle_year,
        vehicle_color: parsed.data.vehicle_color,
        vehicle_seats: parsed.data.vehicle_seats,
        bio: parsed.data.bio ?? null,
        profile_photo_path: profilePath,
        vehicle_photo_path: vehiclePath,
        proof_of_address_path: addressPath,
      };
      const { error, data } = await supabase
        .from("driver_applications")
        .insert(insertRow)
        .select("id, status, postal_code, reviewer_notes")
        .single();
      if (error) {
        // Already submitted (unique constraint on user_id) — load the existing one and show status
        if ((error as any).code === "23505" || /duplicate key|already exists/i.test(error.message)) {
          const { data: existingRow } = await supabase
            .from("driver_applications")
            .select("id, status, postal_code, reviewer_notes")
            .eq("user_id", user!.id)
            .maybeSingle();
          if (existingRow) {
            setExisting(existingRow as Application);
            toast.message("You already submitted an application — here's its status.");
            return;
          }
        }
        throw error;
      }
      setExisting(data as Application);
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display font-light leading-[0.95] tracking-tight text-3xl mb-2">Drive with Kyk n Lyn.</h1>
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
          <form onSubmit={submit} className="surface rounded-3xl border border-border p-8 space-y-6">
            <Section title="About you">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Full legal name"><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="bg-input border-border" /></Field>
                <Field label="Phone number"><Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+27 ..." className="bg-input border-border" /></Field>
                <Field label="ID / passport number"><Input value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} className="bg-input border-border" /></Field>
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
            </Section>

            <Section title="Driver's license">
              <div className="grid md:grid-cols-3 gap-5">
                <Field label="License number"><Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} className="bg-input border-border" /></Field>
                <Field label="License expiry"><Input type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} className="bg-input border-border" /></Field>
                <Field label="Years driving"><Input type="number" min={0} value={form.years_driving} onChange={e => setForm({ ...form, years_driving: e.target.value })} className="bg-input border-border" /></Field>
              </div>
            </Section>

            <Section title="Vehicle">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Make & model"><Input value={form.vehicle_make_model} onChange={e => setForm({ ...form, vehicle_make_model: e.target.value })} placeholder="2019 Honda Civic" className="bg-input border-border" /></Field>
                <Field label="License plate"><Input value={form.vehicle_plate} onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} className="bg-input border-border" /></Field>
                <Field label="Year"><Input type="number" value={form.vehicle_year} onChange={e => setForm({ ...form, vehicle_year: e.target.value })} placeholder="2019" className="bg-input border-border" /></Field>
                <Field label="Color"><Input value={form.vehicle_color} onChange={e => setForm({ ...form, vehicle_color: e.target.value })} className="bg-input border-border" /></Field>
                <Field label="Seats (excl. driver)"><Input type="number" min={1} max={20} value={form.vehicle_seats} onChange={e => setForm({ ...form, vehicle_seats: e.target.value })} className="bg-input border-border" /></Field>
              </div>
            </Section>

            <Section title="Documents">
              <div className="grid md:grid-cols-3 gap-5">
                <FileField label="Profile photo" accept="image/*" file={files.profile} onChange={f => setFiles(p => ({ ...p, profile: f }))} />
                <FileField label="Vehicle photo" accept="image/*" file={files.vehicle} onChange={f => setFiles(p => ({ ...p, vehicle: f }))} />
                <FileField label="Proof of address" accept="image/*,application/pdf" file={files.address} onChange={f => setFiles(p => ({ ...p, address: f }))} />
              </div>
            </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-primary">{title}</h3>
      <div className="space-y-5">{children}</div>
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

function FileField({ label, accept, file, onChange }: { label: string; accept: string; file?: File; onChange: (f: File | undefined) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    if (!file.type.startsWith("image/")) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isPdf = file?.type === "application/pdf";
  const sizeKb = file ? Math.round(file.size / 1024) : 0;

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>

      {!file && (
        <label className="flex items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-border bg-input/50 cursor-pointer hover:bg-input transition-colors text-sm text-muted-foreground text-center px-3">
          <Upload className="size-4 shrink-0" />
          <span className="truncate">Choose file</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
          />
        </label>
      )}

      {file && (
        <div className="relative rounded-xl border border-border bg-input/50 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 z-10 size-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>

          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img src={previewUrl} alt={`${label} preview`} className="w-full h-40 object-cover" />
            </a>
          ) : isPdf ? (
            <a
              href={URL.createObjectURL(file)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 h-40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="size-10" />
              <span className="text-xs font-mono">Open PDF preview</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <FileText className="size-10" />
            </div>
          )}

          <div className="px-3 py-2 text-xs flex items-center justify-between gap-2 border-t border-border bg-background/40">
            <span className="truncate">{file.name}</span>
            <span className="font-mono text-muted-foreground shrink-0">{sizeKb} KB</span>
          </div>

          <label className="block text-center text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary-glow cursor-pointer py-2 border-t border-border">
            Replace
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
