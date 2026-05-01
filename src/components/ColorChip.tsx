/**
 * Topshiriqdagi rangni dumaloq + nom ko'rinishida chiqaradi.
 * - Agar qiymat hex (#RRGGBB) bo'lsa: o'sha rangda dumaloq + hex nomi (yoki ixtiyoriy nom) chiqadi.
 * - Agar qiymat oddiy matn bo'lsa (masalan "kumush"): bo'sh dumaloq + matn chiqadi.
 */
export function ColorChip({
  color,
  name,
  size = "sm",
}: {
  color: string | null | undefined;
  name?: string | null;
  size?: "sm" | "md";
}) {
  if (!color && !name) return null;
  const isHex = !!color && /^#[0-9a-fA-F]{6}$/.test(color);
  const label = name || color || "";
  const dot = size === "md" ? "size-4" : "size-3";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block ${dot} rounded-full border border-border shrink-0`}
        style={isHex ? { backgroundColor: color! } : undefined}
        title={label}
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
