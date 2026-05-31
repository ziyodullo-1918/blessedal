import { supabase } from "@/integrations/supabase/client";

export type ProductCategory = "qish" | "bahor" | "kuz_yoz";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  qish: "Qish",
  bahor: "Bahor",
  kuz_yoz: "Kuz / Yoz",
};

export type FactoryProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  colors: string[];
  image_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RateDept = "laser" | "sewing" | "stretching" | "packaging";

export const RATE_DEPT_LABEL: Record<RateDept, string> = {
  laser: "Lazer",
  sewing: "Tikuv",
  stretching: "Tortuv",
  packaging: "Qadoq",
};

export async function listProducts(): Promise<FactoryProduct[]> {
  const { data, error } = await supabase
    .from("factory_products" as never)
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as FactoryProduct[];
}

export async function upsertProduct(p: {
  id?: string;
  name: string;
  category: ProductCategory;
  colors: string[];
  image_url?: string | null;
  notes?: string | null;
  active?: boolean;
}) {
  const payload = {
    name: p.name,
    category: p.category,
    colors: p.colors,
    image_url: p.image_url ?? null,
    notes: p.notes ?? null,
    active: p.active ?? true,
  };
  if (p.id) {
    const { error } = await supabase
      .from("factory_products" as never)
      .update(payload as never)
      .eq("id", p.id);
    if (error) throw error;
    return p.id;
  }
  const { data, error } = await supabase
    .from("factory_products" as never)
    .insert(payload as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("factory_products" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

// Per-department rates. Packaging uses its own table; others use salary_rates.
export type ProductRate = { department: RateDept; rate_per_unit: number };

export async function listProductRates(productName: string): Promise<ProductRate[]> {
  const [sr, pr] = await Promise.all([
    supabase
      .from("salary_rates")
      .select("department,rate_per_unit")
      .eq("product_name", productName)
      .in("department", ["laser", "sewing", "stretching"]),
    supabase
      .from("packaging_piece_rates" as never)
      .select("rate_per_unit")
      .eq("product_name", productName)
      .maybeSingle(),
  ]);
  if (sr.error) throw sr.error;
  const out: ProductRate[] = (sr.data ?? []).map((r) => ({
    department: r.department as RateDept,
    rate_per_unit: Number(r.rate_per_unit),
  }));
  const packData = (pr.data ?? null) as { rate_per_unit: number } | null;
  if (packData) {
    out.push({ department: "packaging", rate_per_unit: Number(packData.rate_per_unit) });
  }
  return out;
}

export async function saveProductRate(productName: string, department: RateDept, rate: number) {
  if (department === "packaging") {
    // upsert into packaging_piece_rates by product_name
    const { data: existing } = await supabase
      .from("packaging_piece_rates" as never)
      .select("id")
      .eq("product_name", productName)
      .maybeSingle();
    const row = existing as { id: string } | null;
    if (row?.id) {
      const { error } = await supabase
        .from("packaging_piece_rates" as never)
        .update({ rate_per_unit: rate, active: true } as never)
        .eq("id", row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("packaging_piece_rates" as never)
        .insert({ product_name: productName, rate_per_unit: rate, active: true } as never);
      if (error) throw error;
    }
    return;
  }
  // salary_rates has unique (department, product_name) → upsert
  const { error } = await supabase
    .from("salary_rates")
    .upsert(
      { department, product_name: productName, rate_per_unit: rate, active: true } as never,
      { onConflict: "department,product_name" } as never,
    );
  if (error) throw error;
}
