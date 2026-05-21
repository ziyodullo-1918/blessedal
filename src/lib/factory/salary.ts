import { supabase } from "@/integrations/supabase/client";
import type { FactoryDept } from "@/lib/factory/data";

export type SalaryRate = {
  id: string;
  department: FactoryDept;
  product_name: string | null;
  rate_per_unit: number;
  active: boolean;
};

export type WorkerSalary = {
  worker_id: string;
  worker_name: string | null;
  department: FactoryDept;
  total_units: number;
  total_amount: number;
};

export type PayrollPeriod = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  closed_at: string | null;
};

export type PayrollSnapshot = {
  id: string;
  period_id: string;
  worker_id: string;
  worker_name: string;
  department: FactoryDept;
  total_units: number;
  total_amount: number;
};

export async function listRates(): Promise<SalaryRate[]> {
  const { data, error } = await supabase.from("salary_rates").select("*").order("department");
  if (error) throw error;
  return (data ?? []) as SalaryRate[];
}

export async function upsertRate(r: Partial<SalaryRate> & { department: FactoryDept; rate_per_unit: number }) {
  if (r.id) {
    const { error } = await supabase.from("salary_rates")
      .update({ rate_per_unit: r.rate_per_unit, active: r.active ?? true, product_name: r.product_name ?? null } as never)
      .eq("id", r.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("salary_rates").insert({
      department: r.department,
      product_name: r.product_name ?? null,
      rate_per_unit: r.rate_per_unit,
      active: r.active ?? true,
    } as never);
    if (error) throw error;
  }
}

export async function deleteRate(id: string) {
  const { error } = await supabase.from("salary_rates").delete().eq("id", id);
  if (error) throw error;
}

export async function workerSalary(from: string, to: string): Promise<WorkerSalary[]> {
  const { data, error } = await supabase.rpc("factory_worker_salary", { _from: from, _to: to } as never);
  if (error) throw error;
  return (data ?? []) as WorkerSalary[];
}

export async function listPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase.from("factory_payroll_periods")
    .select("*").order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PayrollPeriod[];
}

export async function createPayrollPeriod(p: { label: string; start_date: string; end_date: string }) {
  const { error } = await supabase.from("factory_payroll_periods").insert(p as never);
  if (error) throw error;
}

export async function closePayrollPeriod(id: string) {
  const { error } = await supabase.rpc("factory_close_payroll_period", { _period_id: id } as never);
  if (error) throw error;
}

export async function listSnapshots(periodId: string): Promise<PayrollSnapshot[]> {
  const { data, error } = await supabase.from("factory_payroll_snapshots")
    .select("*").eq("period_id", periodId).order("total_amount", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PayrollSnapshot[];
}

// ---------------- Finished warehouse ----------------
export type FinishedItem = {
  id: string;
  order_id: string | null;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  damaged_quantity: number;
  packaged_at: string;
  note: string | null;
};

export async function listFinished(): Promise<FinishedItem[]> {
  const { data, error } = await supabase.from("finished_inventory")
    .select("*").order("packaged_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as FinishedItem[];
}

export async function finalizePackaging(stageId: string, quantity: number, damaged = 0, note?: string) {
  const { error } = await supabase.rpc("factory_finalize_packaging", {
    _stage_id: stageId,
    _quantity: quantity,
    _damaged: damaged,
    _note: note ?? null,
  } as never);
  if (error) throw error;
}
