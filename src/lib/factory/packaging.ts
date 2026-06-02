import { supabase } from "@/integrations/supabase/client";

export type PackagingRate = {
  id: string;
  product_name: string | null;
  rate_per_unit: number;
  active: boolean;
};

export type PackagingSalaryRow = {
  worker_id: string;
  worker_name: string | null;
  total_units: number;
  total_amount: number;
};

export type PackagingBoxEntry = {
  id: string;
  worker_id: string;
  product_id: string | null;
  product_name: string;
  color: string | null;
  pairs_per_box: number;
  boxes: number;
  units: number;
  unit_price: number;
  total: number;
  work_date: string;
  note: string | null;
  created_at: string;
};

export async function listPackagingRates(): Promise<PackagingRate[]> {
  const { data, error } = await supabase
    .from("packaging_piece_rates")
    .select("*")
    .order("product_name", { nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as PackagingRate[];
}

export async function packagingSalaryReport(from: string, to: string): Promise<PackagingSalaryRow[]> {
  const { data, error } = await supabase.rpc("packaging_salary_report", { _from: from, _to: to } as never);
  if (error) throw error;
  return (data ?? []) as PackagingSalaryRow[];
}

export async function recordPackagingBox(input: {
  worker_id: string;
  product_id: string;
  color: string | null;
  boxes: number;
  work_date?: string;
  note?: string;
}) {
  const { error } = await supabase.rpc("packaging_record_box", {
    _worker_id: input.worker_id,
    _product_id: input.product_id,
    _color: input.color,
    _boxes: input.boxes,
    _work_date: input.work_date ?? null,
    _note: input.note ?? null,
  } as never);
  if (error) throw error;
}

export async function listPackagingEntries(from: string, to: string): Promise<PackagingBoxEntry[]> {
  const { data, error } = await supabase
    .from("packaging_box_entries" as never)
    .select("*")
    .gte("work_date", from)
    .lte("work_date", to)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as PackagingBoxEntry[];
}

export async function deletePackagingEntry(id: string) {
  const { error } = await supabase.rpc("packaging_delete_box_entry", { _entry_id: id } as never);
  if (error) throw error;
}
