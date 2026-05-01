import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, AlertTriangle, TrendingUp, Banknote } from "lucide-react";

interface WalletRow {
  balance_cents: number;
  lifetime_earned_cents: number;
  lifetime_commission_cents: number;
  is_suspended: boolean;
}

interface Tx {
  id: string;
  type: "commission" | "topup" | "adjustment";
  amount_cents: number;
  balance_after_cents: number;
  description: string | null;
  created_at: string;
}

const rand = (cents: number) => `R${(cents / 100).toFixed(2)}`;

export function DriverWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: w }, { data: t }] = await Promise.all([
        supabase.from("driver_wallets").select("*").eq("driver_id", user.id).maybeSingle(),
        supabase.from("wallet_transactions").select("*").eq("driver_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setWallet((w as WalletRow) ?? { balance_cents: 0, lifetime_earned_cents: 0, lifetime_commission_cents: 0, is_suspended: false });
      setTxs((t as Tx[]) ?? []);
    };
    load();

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_wallets", filter: `driver_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `driver_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!wallet) return null;

  const owed = wallet.balance_cents < 0 ? Math.abs(wallet.balance_cents) : 0;
  const credit = wallet.balance_cents > 0 ? wallet.balance_cents : 0;

  return (
    <section className="surface rounded-3xl border border-border p-6 glow-border mb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Wallet</span>
        </div>
        {wallet.is_suspended && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] font-mono uppercase">
            <AlertTriangle className="size-3" /> Suspended
          </span>
        )}
      </div>

      {wallet.is_suspended && (
        <div className="mb-5 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
          <p className="font-medium text-destructive mb-1">You can't accept new rides.</p>
          <p className="text-muted-foreground text-xs">Top up <span className="font-mono text-destructive">{rand(owed)}</span> to your platform balance to resume earning.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Balance" value={rand(wallet.balance_cents)} accent={wallet.balance_cents < 0 ? "destructive" : "primary"} />
        <Stat label="Lifetime earned" value={rand(wallet.lifetime_earned_cents)} accent="pulse" icon={TrendingUp} />
        <Stat label="Total commission" value={rand(wallet.lifetime_commission_cents)} accent="muted" />
      </div>

      <div className="rounded-2xl border border-border bg-input/30 p-4 mb-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">How to top up</p>
        <p className="text-sm text-foreground/90 leading-relaxed">
          Pay your outstanding commission via EFT to the platform. Once admin confirms your payment, your balance updates automatically and any suspension is lifted.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Recent activity</p>
        {txs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No transactions yet — complete your first ride to start earning.</p>
        ) : (
          <div className="space-y-2">
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Banknote className={`size-3.5 shrink-0 ${tx.amount_cents > 0 ? "text-pulse" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="truncate">{tx.description ?? tx.type}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`font-mono shrink-0 ${tx.amount_cents > 0 ? "text-pulse" : "text-foreground"}`}>
                  {tx.amount_cents > 0 ? "+" : ""}{rand(tx.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: string; accent: "primary" | "pulse" | "muted" | "destructive"; icon?: any }) {
  const color = accent === "destructive" ? "text-destructive" : accent === "pulse" ? "text-pulse" : accent === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="size-3 text-muted-foreground" />}
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={`font-display text-xl font-medium ${color}`}>{value}</p>
    </div>
  );
}
