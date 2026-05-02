import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

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

const driverAccountSchema = z.object(baseCreds);

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
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", postalCode: "" });
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
        data: { full_name: form.fullName, postal_code: form.postalCode, phone: form.phone },
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
        <FieldRow label="Mobile number"><Input type="tel" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0821234567" /></FieldRow>
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
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", postalCode: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = driverAccountSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/become-driver`,
        data: { full_name: form.fullName, postal_code: form.postalCode, phone: form.phone },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate("/become-driver");
    else toast.success("Check your email, then sign in to submit your driver application.");
  };

  return (
    <>
      <h2 className="font-display text-2xl font-light mb-1">Create a driver account.</h2>
      <p className="text-sm text-muted-foreground mb-6">After email confirmation, sign in and tap Drive to submit documents for admin review.</p>
      <form onSubmit={submit} className="space-y-4">
        <FieldRow label="Full name"><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Doe" /></FieldRow>
        <FieldRow label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@neighborhood.com" /></FieldRow>
        <FieldRow label="Mobile number"><Input type="tel" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0821234567" /></FieldRow>
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
        <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold rounded-2xl">
          {loading ? "..." : "Create account to apply"}
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

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
