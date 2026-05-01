import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";

const ELSIES_RIVER_POSTAL = "7490";

const baseCreds = {
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(\+27|0)[6-8][0-9]{8}$/, "Enter a valid SA mobile number (e.g. 0821234567 or +27821234567)"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Postal code must be 4 digits")
    .refine((v) => v === ELSIES_RIVER_POSTAL, "Sign-ups are limited to Elsies River (7490)"),
};

const riderSchema = z.object(baseCreds);

const driverSchema = z.object({
  ...baseCreds,
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  id_number: z.string().trim().min(5, "ID / passport number is required").max(30),
  address: z.string().trim().min(5, "Home address is required").max(200),
  license_number: z.string().trim().min(3, "License number is required").max(30),
  license_expiry: z.string().min(1, "License expiry is required"),
  years_driving: z.coerce.number().int().min(0).max(80),
  vehicle_make_model: z.string().trim().min(2, "Vehicle make/model is required").max(80),
  vehicle_plate: z.string().trim().min(2, "License plate is required").max(20),
  vehicle_year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  vehicle_color: z.string().trim().min(2, "Vehicle color is required").max(30),
  vehicle_seats: z.coerce.number().int().min(1).max(20),
  bio: z.string().trim().max(400).optional(),
});

const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-10 flex justify-center"><Logo size="lg" /></div>
        <div className="surface rounded-3xl border border-border p-8 glow-border">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <SignInForm />
            </TabsContent>

            <TabsContent value="signup">
              <SignUpTabs />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate("/");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <>
      <h1 className="font-display text-3xl font-light tracking-tight mb-2">Welcome back.</h1>
      <p className="text-sm text-muted-foreground mb-8">Ride with neighbors you actually know.</p>

      <form onSubmit={submit} className="space-y-4">
        <FieldRow label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@neighborhood.com" /></FieldRow>
        <FieldRow label="Password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></FieldRow>
        <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold">
          {loading ? "..." : "Sign in"}
        </Button>
      </form>

      <Divider />
      <Button onClick={google} variant="outline" className="w-full h-12 border-border bg-secondary hover:bg-accent">
        Continue with Google
      </Button>
    </>
  );
}

function SignUpTabs() {
  return (
    <Tabs defaultValue="rider" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="rider">I'm a rider</TabsTrigger>
        <TabsTrigger value="driver">I want to drive</TabsTrigger>
      </TabsList>

      <TabsContent value="rider">
        <RiderSignUp />
      </TabsContent>
      <TabsContent value="driver">
        <DriverSignUp />
      </TabsContent>
    </Tabs>
  );
}

function RiderSignUp() {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", postalCode: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = riderSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.fullName, postal_code: form.postalCode },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  };

  return (
    <>
      <h2 className="font-display text-2xl font-light mb-1">Join as a rider.</h2>
      <p className="text-sm text-muted-foreground mb-6">Open to Elsies River residents (7490).</p>
      <form onSubmit={submit} className="space-y-4">
        <FieldRow label="Full name"><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Doe" /></FieldRow>
        <FieldRow label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@neighborhood.com" /></FieldRow>
        <FieldRow label="Password"><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></FieldRow>
        <FieldRow label="Postal code">
          <Input
            inputMode="numeric"
            maxLength={4}
            value={form.postalCode}
            onChange={e => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })}
            placeholder="7490"
          />
        </FieldRow>
        <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold">
          {loading ? "..." : "Create rider account"}
        </Button>
      </form>
    </>
  );
}

function DriverSignUp() {
  const [form, setForm] = useState({
    email: "", password: "", fullName: "", postalCode: "",
    phone: "", id_number: "", address: "",
    license_number: "", license_expiry: "", years_driving: "",
    vehicle_make_model: "", vehicle_plate: "", vehicle_year: "", vehicle_color: "", vehicle_seats: "",
    bio: "",
  });
  const [files, setFiles] = useState<{ profile?: File; vehicle?: File; address?: File }>({});
  const [loading, setLoading] = useState(false);

  const uploadFile = async (userId: string, file: File, kind: string): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("driver-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = driverSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!files.profile) { toast.error("Please upload a profile photo"); return; }
    if (!files.vehicle) { toast.error("Please upload a vehicle photo"); return; }
    if (!files.address) { toast.error("Please upload proof of address"); return; }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: form.fullName, postal_code: form.postalCode },
        },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is required, there's no session yet — uploads/inserts need auth
      if (!signUpData.session) {
        toast.success("Account created! Confirm your email, then sign in to finish your driver application.");
        return;
      }

      const userId = signUpData.user!.id;
      const [profilePath, vehiclePath, addressPath] = await Promise.all([
        uploadFile(userId, files.profile, "profile"),
        uploadFile(userId, files.vehicle, "vehicle"),
        uploadFile(userId, files.address, "address"),
      ]);

      const { error: appError } = await supabase.from("driver_applications").insert({
        user_id: userId,
        full_name: parsed.data.fullName,
        postal_code: parsed.data.postalCode,
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
      });
      if (appError) throw appError;

      toast.success("Account & driver application submitted! An admin will review it shortly.");
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="font-display text-2xl font-light mb-1">Apply to drive.</h2>
      <p className="text-sm text-muted-foreground mb-6">Drivers must reside in Elsies River (7490). An admin reviews every application.</p>
      <form onSubmit={submit} className="space-y-6">
        <Section title="Account">
          <div className="grid md:grid-cols-2 gap-4">
            <FieldRow label="Full legal name"><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></FieldRow>
            <FieldRow label="Phone"><Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+27 ..." /></FieldRow>
            <FieldRow label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></FieldRow>
            <FieldRow label="Password"><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></FieldRow>
            <FieldRow label="Postal code">
              <Input
                inputMode="numeric"
                maxLength={4}
                value={form.postalCode}
                onChange={e => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })}
                placeholder="7490"
              />
            </FieldRow>
            <FieldRow label="ID / passport number"><Input value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} /></FieldRow>
          </div>
          <FieldRow label="Home address"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></FieldRow>
        </Section>

        <Section title="Driver's license">
          <div className="grid md:grid-cols-3 gap-4">
            <FieldRow label="License number"><Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></FieldRow>
            <FieldRow label="Expiry"><Input type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} /></FieldRow>
            <FieldRow label="Years driving"><Input type="number" min={0} value={form.years_driving} onChange={e => setForm({ ...form, years_driving: e.target.value })} /></FieldRow>
          </div>
        </Section>

        <Section title="Vehicle">
          <div className="grid md:grid-cols-2 gap-4">
            <FieldRow label="Make & model"><Input value={form.vehicle_make_model} onChange={e => setForm({ ...form, vehicle_make_model: e.target.value })} placeholder="2019 Honda Civic" /></FieldRow>
            <FieldRow label="License plate"><Input value={form.vehicle_plate} onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} /></FieldRow>
            <FieldRow label="Year"><Input type="number" value={form.vehicle_year} onChange={e => setForm({ ...form, vehicle_year: e.target.value })} placeholder="2019" /></FieldRow>
            <FieldRow label="Color"><Input value={form.vehicle_color} onChange={e => setForm({ ...form, vehicle_color: e.target.value })} /></FieldRow>
            <FieldRow label="Seats (excl. driver)"><Input type="number" min={1} max={20} value={form.vehicle_seats} onChange={e => setForm({ ...form, vehicle_seats: e.target.value })} /></FieldRow>
          </div>
        </Section>

        <Section title="Documents">
          <div className="grid md:grid-cols-3 gap-4">
            <FileField label="Profile photo" accept="image/*" file={files.profile} onChange={f => setFiles(p => ({ ...p, profile: f }))} />
            <FileField label="Vehicle photo" accept="image/*" file={files.vehicle} onChange={f => setFiles(p => ({ ...p, vehicle: f }))} />
            <FileField label="Proof of address" accept="image/*,application/pdf" file={files.address} onChange={f => setFiles(p => ({ ...p, address: f }))} />
          </div>
        </Section>

        <FieldRow label="About you (optional)"><Textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="I've lived in Elsies River for 9 years..." /></FieldRow>

        <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold rounded-2xl">
          {loading ? "Submitting..." : "Create driver account & apply"}
        </Button>
      </form>
    </>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-primary">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function FileField({ label, accept, file, onChange }: { label: string; accept: string; file?: File; onChange: (f: File | undefined) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const isPdf = file?.type === "application/pdf";

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      {!file ? (
        <label className="flex items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-border bg-input/50 cursor-pointer hover:bg-input transition-colors text-sm text-muted-foreground text-center px-3">
          <Upload className="size-4 shrink-0" />
          <span className="truncate">Choose file</span>
          <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        </label>
      ) : (
        <div className="relative rounded-xl border border-border bg-input/50 overflow-hidden">
          <button type="button" onClick={() => onChange(undefined)} className="absolute top-2 right-2 z-10 size-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Remove">
            <X className="size-4" />
          </button>
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="w-full h-32 object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-1">
              <FileText className="size-8" />
              {isPdf && <span className="text-[10px] font-mono">PDF</span>}
            </div>
          )}
          <div className="px-3 py-2 text-xs truncate border-t border-border bg-background/40">{file.name}</div>
        </div>
      )}
    </div>
  );
}
