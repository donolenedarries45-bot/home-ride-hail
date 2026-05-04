import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, TrendingUp, Wallet } from "lucide-react";

interface DriverWalletRow {
  driver_id: string;
  balance_cents: number;
  lifetime_earned_cents: number;
  lifetime_commission_cents: number;
  is_suspended: boolean;
  full_name?: string | null;
}

const rand = (cents: number) => `R${(cents / 100).toFixed(2)}`;

export function CommissionDashboard() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<DriverWalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  // settlement form state
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"eft" | "cash" | "other">("eft");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: w } = await supabase
      .from("driver_wallets")
      .select("*")
      .order("balance_cents", { ascending: true });

    const ids = (w ?? []).map((r: any) => r.driver_id);
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Driver"]));
    }
    setWallets(((w ?? []) as DriverWalletRow[]).map(r => ({ ...r, full_name: names[r.driver_id] ?? "Driver" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const recordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!selectedDriver || !cents || cents <= 0) { toast.error("Pick a driver and enter a valid amount"); return; }
    const { error } = await supabase.from("commission_settlements").insert({
      driver_id: selectedDriver,
      amount_cents: cents,
      method,
      reference: reference || null,
      notes: notes || null,
      recorded_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Settlement recorded · ${rand(cents)}`);
    setAmount(""); setReference(""); setNotes("");
    load();
  };

  const toggleSuspension = async (driverId: string, currentlySuspended: boolean) => {
    const action = currentlySuspended ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${action} this driver?`)) return;
    const { error } = await supabase
      .from("driver_wallets")
      .update({ is_suspended: !currentlySuspended })
      .eq("driver_id", driverId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Driver ${action}ed`);
    load();
  };

  const totalOutstanding = wallets.reduce((sum, w) => sum + (w.balance_cents < 0 ? Math.abs(w.balance_cents) : 0), 0);
  const totalCommissionLifetime = wallets.reduce((sum, w) => sum + w.lifetime_commission_cents, 0);
  const suspendedCount = wallets.filter(w => w.is_suspended).length;

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl mb-4">Commission &amp; payouts</h2>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Stat label="Outstanding from drivers" value={rand(totalOutstanding)} accent="destructive" icon={AlertTriangle} />
        <Stat label="Lifetime commission earned" value={rand(totalCommissionLifetime)} accent="primary" icon={TrendingUp} />
        <Stat label="Suspended drivers" value={String(suspendedCount)} accent="muted" icon={Wallet} />
      </div>

      <form onSubmit={recordSettlement} className="surface rounded-2xl border border-primary/20 p-5 mb-6 grid md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Driver</Label>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="bg-input border-border mt-1"><SelectValue placeholder="Pick driver" /></SelectTrigger>
            <SelectContent>
              {wallets.map(w => (
                <SelectItem key={w.driver_id} value={w.driver_id}>
                  {w.full_name} {w.balance_cents < 0 ? `· owes ${rand(Math.abs(w.balance_cents))}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Amount (R)</Label>
          <Input type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="bg-input border-border mt-1" />
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase text-muted-foreground">Method</Label>
          <Select value={method} onValueChange={(v: any) => setMethod(v)}>
            <SelectTrigger className="bg-input border-border mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eft">EFT</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end"><Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary-glow">Record top-up</Button></div>
        <div className="md:col-span-3">
          <Input placeholder="Reference (e.g. EFT ref number)" value={reference} onChange={e => setReference(e.target.value)} className="bg-input border-border" />
        </div>
        <div className="md:col-span-2">
          <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-input border-border" />
        </div>
      </form>

      <div className="space-y-2">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!loading && wallets.length === 0 && <p className="text-muted-foreground text-sm">No drivers with wallets yet.</p>}
        {wallets.map(w => (
          <div key={w.driver_id} className={`surface rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-center ${w.is_suspended ? "border-destructive/40" : "border-border"}`}>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{w.full_name}</p>
                {w.is_suspended && <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-mono uppercase">Suspended</span>}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground truncate">{w.driver_id}</p>
            </div>
            <Field label="Balance" value={rand(w.balance_cents)} accent={w.balance_cents < 0 ? "destructive" : "pulse"} />
            <Field label="Lifetime earned" value={rand(w.lifetime_earned_cents)} />
            <Field label="Commission" value={rand(w.lifetime_commission_cents)} accent="primary" />
            <Button
              type="button"
              size="sm"
              variant={w.is_suspended ? "default" : "destructive"}
              onClick={() => toggleSuspension(w.driver_id, w.is_suspended)}
              className="w-full"
            >
              {w.is_suspended ? "Unsuspend" : "Suspend"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: string; accent: "primary" | "pulse" | "muted" | "destructive"; icon: any }) {
  const color = accent === "destructive" ? "text-destructive" : accent === "pulse" ? "text-pulse" : accent === "muted" ? "text-foreground" : "text-primary";
  return (
    <div className="surface rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={`font-display text-2xl font-medium ${color}`}>{value}</p>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: "primary" | "pulse" | "destructive" }) {
  const color = accent === "destructive" ? "text-destructive" : accent === "pulse" ? "text-pulse" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm ${color}`}>{value}</p>
    </div>
  );
}
