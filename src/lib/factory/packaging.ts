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

export async function listPackagingRates(): Promise<PackagingRate[]> {
  const { data, error } = await supabase.from("packaging_piece_rates")
    .select("*").order("product_name", { nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as PackagingRate[];
}

export async function upsertPackagingRate(r: { id?: string; product_name: string | null; rate_per_unit: number; active?: boolean }) {
  if (r.id) {
    const { error } = await supabase.from("packaging_piece_rates")
      .update({ product_name: r.product_name, rate_per_unit: r.rate_per_unit, active: r.active ?? true } as never)
      .eq("id", r.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("packaging_piece_rates").insert({
      product_name: r.product_name, rate_per_unit: r.rate_per_unit, active: r.active ?? true,
    } as never);
    if (error) throw error;
  }
}

export async function deletePackagingRate(id: string) {
  const { error } = await supabase.from("packaging_piece_rates").delete().eq("id", id);
  if (error) throw error;
}

export async function packagingSalaryReport(from: string, to: string): Promise<PackagingSalaryRow[]> {
  const { data, error } = await supabase.rpc("packaging_salary_report", { _from: from, _to: to } as never);
  if (error) throw error;
  return (data ?? []) as PackagingSalaryRow[];
}

// ---- Worker auth (Tortuv-style) ----
const PKG_TOKEN_KEY = "packaging_worker_token";
const PKG_NAME_KEY = "packaging_worker_name";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type PackagingWorkerSession = {
  id: string; worker_code: string; full_name: string; session_token: string; expires_at: string;
};

export async function packagingWorkerLogin(code: string, pin: string): Promise<PackagingWorkerSession | null> {
  const hash = await sha256(pin);
  const { data, error } = await supabase.rpc("packaging_worker_login", { _code: code, _pin_hash: hash } as never);
  if (error) throw error;
  const row = (data as PackagingWorkerSession[] | null)?.[0];
  if (!row) return null;
  localStorage.setItem(PKG_TOKEN_KEY, row.session_token);
  localStorage.setItem(PKG_NAME_KEY, row.full_name);
  return row;
}

export function packagingWorkerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PKG_TOKEN_KEY);
}
export function packagingWorkerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PKG_NAME_KEY);
}

export async function packagingWorkerLogout() {
  const tok = packagingWorkerToken();
  if (tok) await supabase.rpc("packaging_worker_logout", { _token: tok } as never);
  localStorage.removeItem(PKG_TOKEN_KEY);
  localStorage.removeItem(PKG_NAME_KEY);
}

export type PackagingWorkerTask = {
  stage_id: string; order_id: string; order_number: string;
  product_name: string; color: string | null;
  planned: number; completed: number; rejected: number; status: string;
};

export async function packagingWorkerTasks(): Promise<PackagingWorkerTask[]> {
  const tok = packagingWorkerToken(); if (!tok) throw new Error("not_logged_in");
  const { data, error } = await supabase.rpc("packaging_worker_tasks", { _token: tok } as never);
  if (error) throw error;
  return (data ?? []) as PackagingWorkerTask[];
}

export async function packagingWorkerPack(stageId: string, quantity: number, damaged = 0, note?: string) {
  const tok = packagingWorkerToken(); if (!tok) throw new Error("not_logged_in");
  const { error } = await supabase.rpc("packaging_worker_pack", {
    _token: tok, _stage_id: stageId, _quantity: quantity, _damaged: damaged, _note: note ?? null,
  } as never);
  if (error) throw error;
}

export async function packagingWorkerToday(): Promise<{ total_units: number; total_amount: number }> {
  const tok = packagingWorkerToken(); if (!tok) throw new Error("not_logged_in");
  const { data, error } = await supabase.rpc("packaging_worker_today", { _token: tok } as never);
  if (error) throw error;
  const row = (data as { total_units: number; total_amount: number }[] | null)?.[0];
  return { total_units: Number(row?.total_units ?? 0), total_amount: Number(row?.total_amount ?? 0) };
}
