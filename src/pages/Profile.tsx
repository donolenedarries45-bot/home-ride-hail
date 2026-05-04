import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, User, Loader2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const onPickFile = () => fileRef.current?.click();

  const compressImage = async (file: File, maxDim = 800, quality = 0.85): Promise<Blob> => {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
      bitmap.close?.();
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }

    setUploading(true);
    const compressed = await compressImage(file);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("rider-avatars")
      .upload(path, compressed, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }

    const { data: pub } = supabase.storage.from("rider-avatars").getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    setAvatarUrl(url);
    toast.success("Profile photo updated");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  const initials = (fullName || user?.email || "?").split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-display font-light tracking-tight text-3xl mb-2">Your profile.</h1>
        <p className="text-muted-foreground mb-10">Help your driver recognize you.</p>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={save} className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="You" className="size-24 rounded-full object-cover border-2 border-primary/40" />
                ) : (
                  <div className="size-24 rounded-full bg-secondary border-2 border-primary/40 flex items-center justify-center text-xl font-semibold">
                    {initials || <User className="size-7 text-muted-foreground" />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onPickFile}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow shadow-lg disabled:opacity-50"
                  aria-label="Upload photo"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            <div>
              <Label htmlFor="full_name" className="text-[10px] font-mono uppercase text-muted-foreground">Full name</Label>
              <Input id="full_name" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-input border-border mt-1" />
            </div>

            <div>
              <Label htmlFor="phone" className="text-[10px] font-mono uppercase text-muted-foreground">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="bg-input border-border mt-1" />
            </div>

            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary-glow">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
