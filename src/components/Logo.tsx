export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dot = size === "sm" ? "size-2.5" : size === "lg" ? "size-3.5" : "size-3";
  const text =
    size === "sm"
      ? "text-base"
      : size === "lg"
      ? "text-2xl md:text-3xl"
      : "text-lg md:text-3xl";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dot} rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.5)]`} />
      <span className={`${text} font-semibold tracking-tight font-display whitespace-nowrap`}>Kyk n Lyn</span>
    </div>
  );
}
