import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; created_at: string };
export type Product = {
  id: string;
  name: string;
  price_per_unit: number;
  category_id: string | null;
  is_active: boolean;
  colors: string[];
  created_at: string;
  category?: { name: string } | null;
};
export type Worker = { id: string; full_name: string; phone: string | null; created_at: string };
export type Assignment = {
  id: string;
  worker_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  created_at: string;
  period_id: string | null;
  color: string | null;
  color_name: string | null;
  worker?: { full_name: string } | null;
  product?: { name: string } | null;
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// Categories
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}
export async function createCategory(name: string) {
  const user_id = await uid();
  const { error } = await supabase.from("categories").insert({ name, user_id });
  if (error) throw error;
}
export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Products
export async function listProducts(opts?: { activeOnly?: boolean }): Promise<Product[]> {
  let q = supabase
    .from("products")
    .select("*, category:categories(name)")
    .order("name");
  if (opts?.activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Product[];
}
export async function createProduct(p: {
  name: string;
  price_per_unit: number;
  category_id: string | null;
  colors?: string[];
  is_active?: boolean;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("products").insert({ ...p, user_id } as never);
  if (error) throw error;
}
export async function updateProduct(
  id: string,
  p: Partial<{
    name: string;
    price_per_unit: number;
    category_id: string | null;
    colors: string[];
    is_active: boolean;
  }>,
) {
  const { error } = await supabase.from("products").update(p as never).eq("id", id);
  if (error) throw error;
}
export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// Workers
export async function listWorkers(): Promise<Worker[]> {
  const { data, error } = await supabase.from("workers").select("*").order("full_name");
  if (error) throw error;
  return data as Worker[];
}
export async function createWorker(w: { full_name: string; phone: string | null }) {
  const user_id = await uid();
  const { error } = await supabase.from("workers").insert({ ...w, user_id });
  if (error) throw error;
}
export async function updateWorker(id: string, w: { full_name: string; phone: string | null }) {
  const { error } = await supabase.from("workers").update(w).eq("id", id);
  if (error) throw error;
}
export async function deleteWorker(id: string) {
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) throw error;
}

// Assignments
export async function listAssignments(filters?: {
  status?: "in_progress" | "completed";
  workerId?: string;
  /** When true, only return assignments belonging to the currently open period (or no period). */
  activePeriodOnly?: boolean;
}): Promise<Assignment[]> {
  let activePeriodId: string | null = null;
  if (filters?.activePeriodOnly) {
    const { data: openPeriod } = await supabase
      .from("payroll_periods")
      .select("id")
      .is("closed_at", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    activePeriodId = openPeriod?.id ?? null;
  }
  let q = supabase
    .from("assignments")
    .select("*, worker:workers(full_name), product:products(name)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.workerId) q = q.eq("worker_id", filters.workerId);
  if (filters?.activePeriodOnly) {
    if (activePeriodId) q = q.eq("period_id", activePeriodId);
    else q = q.is("period_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Assignment[];
}

export async function createAssignment(a: {
  worker_id: string;
  product_id: string;
  quantity: number;
  /** Optional custom start date (admin only). Defaults to now. */
  started_at?: string;
  color?: string | null;
  color_name?: string | null;
}) {
  const user_id = await uid();
  const { data: prod, error: pe } = await supabase
    .from("products")
    .select("price_per_unit")
    .eq("id", a.product_id)
    .single();
  if (pe) throw pe;
  // Find currently open period (no closed_at, latest start_date)
  const { data: openPeriod } = await supabase
    .from("payroll_periods")
    .select("id")
    .is("closed_at", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("assignments").insert({
    worker_id: a.worker_id,
    product_id: a.product_id,
    quantity: a.quantity,
    unit_price: prod.price_per_unit,
    user_id,
    status: "in_progress",
    started_at: a.started_at ?? new Date().toISOString(),
    period_id: openPeriod?.id ?? null,
    color: a.color ?? null,
  } as never);
  if (error) throw error;
}

export async function completeAssignment(id: string) {
  const { error } = await supabase
    .from("assignments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

// Reports
export type ReportRow = Assignment & {
  worker: { id: string; full_name: string };
  product: { id: string; name: string } | null;
};

export async function reportByRange(startISO: string, endISO: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, worker:workers(id, full_name), product:products(id, name)")
    .eq("status", "completed")
    .gte("completed_at", startISO)
    .lt("completed_at", endISO)
    .order("completed_at", { ascending: true });
  if (error) throw error;
  return data as unknown as ReportRow[];
}

export async function monthlyReport(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return reportByRange(start, end);
}

// Payroll periods
export type PayrollPeriod = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  closed_at: string | null;
  created_at: string;
};

export async function listPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data as PayrollPeriod[];
}

export async function createPayrollPeriod(p: { label: string; start_date: string; end_date: string }) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("payroll_periods")
    .insert({ ...p, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as PayrollPeriod;
}

export async function closePayrollPeriod(id: string) {
  const { error } = await supabase
    .from("payroll_periods")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function reopenPayrollPeriod(id: string) {
  const { error } = await supabase
    .from("payroll_periods")
    .update({ closed_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePayrollPeriod(id: string) {
  const { error } = await supabase.from("payroll_periods").delete().eq("id", id);
  if (error) throw error;
}

// Close current period and create the next one.
// Any in-progress assignments are moved to the new period.
export async function closeAndStartNextPeriod(
  periodId: string,
  newLabel: string,
  options?: { closeDate?: string; newStartDate?: string },
) {
  const { data, error } = await supabase.rpc("close_period_and_rollover", {
    _period_id: periodId,
    _new_label: newLabel,
    _close_date: options?.closeDate ?? null,
    _new_start: options?.newStartDate ?? null,
  } as never);
  if (error) throw error;
  return data as string; // new period id
}

// Auto-name a period like "Aprel boshi", "Aprel o'rtasi", "Aprel ohiri"
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
export function autoPeriodLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const month = MONTHS_UZ[(m - 1) % 12];
  let part = "boshi";
  if (d >= 21) part = "ohiri";
  else if (d >= 11) part = "o'rtasi";
  return `${month} ${part} (${y})`;
}

// Assignments grouped/filtered by period
export async function listAssignmentsByPeriod(periodId: string): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, worker:workers(full_name), product:products(name)")
    .eq("period_id", periodId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Assignment[];
}

// Report by saved period (uses period_id, not date range — handles rollovers)
export async function reportByPeriod(periodId: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, worker:workers(id, full_name), product:products(id, name)")
    .eq("status", "completed")
    .eq("period_id", periodId)
    .order("completed_at", { ascending: true });
  if (error) throw error;
  return data as unknown as ReportRow[];
}

// Founders (sub-users created by admin)
export type Founder = {
  id: string;
  login_id: string;
  full_name: string;
  created_at: string;
};

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listFounders(): Promise<Founder[]> {
  const { data, error } = await supabase
    .from("founders")
    .select("id, login_id, full_name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Founder[];
}

export async function createFounder(f: { login_id: string; full_name: string; pin: string }) {
  const admin_user_id = await uid();
  const pin_hash = await sha256Hex(f.pin);
  const { error } = await supabase.from("founders").insert({
    admin_user_id,
    login_id: f.login_id.trim(),
    full_name: f.full_name.trim(),
    pin_hash,
  });
  if (error) throw error;
}

export async function deleteFounder(id: string) {
  const { error } = await supabase.from("founders").delete().eq("id", id);
  if (error) throw error;
}

export async function updateFounderPin(id: string, pin: string) {
  const pin_hash = await sha256Hex(pin);
  const { error } = await supabase.from("founders").update({ pin_hash }).eq("id", id);
  if (error) throw error;
}
