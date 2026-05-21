import { supabase } from "@/integrations/supabase/client";

export type Material = {
  id: string;
  name: string;
  material_type: string;
  unit: string;
  stock_quantity: number;
  min_stock: number;
  notes: string | null;
  updated_at: string;
};

export type Formula = {
  id: string;
  product_name: string;
  material_id: string;
  quantity_per_unit: number;
  material?: Material;
};

export type Movement = {
  id: string;
  material_id: string;
  delta: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  created_at: string;
};

export type MaterialRequirement = {
  material_id: string;
  material_name: string;
  unit: string;
  required_qty: number;
  available_qty: number;
  shortage: number;
};

// Materials
export async function listMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("inventory_materials" as never)
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Material[];
}

export async function upsertMaterial(m: {
  id?: string;
  name: string;
  material_type: string;
  unit: string;
  stock_quantity: number;
  min_stock: number;
  notes?: string | null;
}) {
  const payload = {
    name: m.name,
    material_type: m.material_type,
    unit: m.unit,
    stock_quantity: m.stock_quantity,
    min_stock: m.min_stock,
    notes: m.notes ?? null,
  };
  if (m.id) {
    const { error } = await supabase
      .from("inventory_materials" as never)
      .update(payload as never)
      .eq("id", m.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("inventory_materials" as never)
      .insert(payload as never);
    if (error) throw error;
  }
}

export async function deleteMaterial(id: string) {
  const { error } = await supabase.from("inventory_materials" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function adjustStock(materialId: string, delta: number, reason: string, note?: string) {
  const { error } = await supabase.rpc("inventory_adjust_stock" as never, {
    _material_id: materialId,
    _delta: delta,
    _reason: reason,
    _note: note ?? null,
  } as never);
  if (error) throw error;
}

// Formulas
export async function listFormulas(): Promise<Formula[]> {
  const { data, error } = await supabase
    .from("product_formulas" as never)
    .select("*, material:inventory_materials(*)")
    .order("product_name");
  if (error) throw error;
  return (data ?? []) as unknown as Formula[];
}

export async function listFormulasByProduct(productName: string): Promise<Formula[]> {
  const { data, error } = await supabase
    .from("product_formulas" as never)
    .select("*, material:inventory_materials(*)")
    .eq("product_name", productName);
  if (error) throw error;
  return (data ?? []) as unknown as Formula[];
}

export async function upsertFormula(f: {
  id?: string;
  product_name: string;
  material_id: string;
  quantity_per_unit: number;
}) {
  if (f.id) {
    const { error } = await supabase
      .from("product_formulas" as never)
      .update({ quantity_per_unit: f.quantity_per_unit } as never)
      .eq("id", f.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("product_formulas" as never)
      .insert({
        product_name: f.product_name,
        material_id: f.material_id,
        quantity_per_unit: f.quantity_per_unit,
      } as never);
    if (error) throw error;
  }
}

export async function deleteFormula(id: string) {
  const { error } = await supabase.from("product_formulas" as never).delete().eq("id", id);
  if (error) throw error;
}

// Requirements for an order
export async function orderRequirements(orderId: string): Promise<MaterialRequirement[]> {
  const { data, error } = await supabase.rpc("factory_order_material_requirements" as never, {
    _order_id: orderId,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as MaterialRequirement[];
}

export async function consumeOrderMaterials(orderId: string) {
  const { error } = await supabase.rpc("factory_consume_order_materials" as never, {
    _order_id: orderId,
  } as never);
  if (error) throw error;
}

export async function recentMovements(limit = 50): Promise<Movement[]> {
  const { data, error } = await supabase
    .from("inventory_movements" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Movement[];
}
