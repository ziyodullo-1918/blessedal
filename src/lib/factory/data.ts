import { supabase } from "@/integrations/supabase/client";

export type FactoryDept =
  | "laser" | "sewing" | "stretching" | "packaging" | "warehouse" | "delivery" | "admin";

export type StageStatus =
  | "pending" | "in_progress" | "partial" | "completed" | "waiting_material" | "rejected";

export type OrderStatus = StageStatus;

export const DEPT_FLOW: FactoryDept[] = [
  "laser", "sewing", "stretching", "packaging", "warehouse",
];

export const DEPT_LABEL: Record<FactoryDept, string> = {
  laser: "Laser",
  sewing: "Tikuv",
  stretching: "Tortuv",
  packaging: "Qadoq",
  warehouse: "Ombor",
  delivery: "Yetkazib berish",
  admin: "Admin",
};

export const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Kutilmoqda",
  in_progress: "Jarayonda",
  partial: "Qisman",
  completed: "Bajarildi",
  waiting_material: "Material kutmoqda",
  rejected: "Brak",
};

export const STATUS_COLOR: Record<StageStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  partial: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  waiting_material: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  rejected: "bg-red-500/20 text-red-300 border-red-500/40",
};

export type FactoryOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  color: string | null;
  size: string | null;
  total_quantity: number;
  status: OrderStatus;
  priority: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FactoryStage = {
  id: string;
  order_id: string;
  department: FactoryDept;
  sequence_no: number;
  planned_quantity: number;
  completed_quantity: number;
  rejected_quantity: number;
  status: StageStatus;
  assigned_worker_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
};

export type FactoryWorker = {
  id: string;
  full_name: string;
  worker_code: string;
  department: FactoryDept;
  phone: string | null;
  active: boolean;
  created_at: string;
};

// ---------------- Orders ----------------
export async function listOrders(): Promise<FactoryOrder[]> {
  const { data, error } = await supabase
    .from("factory_orders")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as FactoryOrder[];
}

export async function getOrder(id: string): Promise<FactoryOrder | null> {
  const { data, error } = await supabase
    .from("factory_orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as FactoryOrder | null;
}

export async function createOrder(input: {
  customer_name: string;
  product_name: string;
  color?: string | null;
  size?: string | null;
  total_quantity: number;
  due_date?: string | null;
  priority?: number;
  notes?: string | null;
}): Promise<string> {
  const { data: numData, error: ne } = await supabase.rpc("factory_next_order_number");
  if (ne) throw ne;
  const order_number = numData as string;
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("factory_orders")
    .insert({
      order_number,
      customer_name: input.customer_name,
      product_name: input.product_name,
      color: input.color ?? null,
      size: input.size ?? null,
      total_quantity: input.total_quantity,
      due_date: input.due_date ?? null,
      priority: input.priority ?? 0,
      notes: input.notes ?? null,
      created_by: user.user?.id ?? null,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("factory_orders").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Stages ----------------
export async function listStagesByOrder(orderId: string): Promise<FactoryStage[]> {
  const { data, error } = await supabase
    .from("factory_stages")
    .select("*")
    .eq("order_id", orderId)
    .order("sequence_no");
  if (error) throw error;
  return data as FactoryStage[];
}

export async function listStagesByDept(dept: FactoryDept) {
  const { data, error } = await supabase
    .from("factory_stages")
    .select("*, order:factory_orders(*)")
    .eq("department", dept)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as (FactoryStage & { order: FactoryOrder })[];
}

export async function reportProgress(stageId: string, completedDelta: number, rejectedDelta = 0, note?: string) {
  const { error } = await supabase.rpc("factory_report_stage_progress", {
    _stage_id: stageId,
    _completed_delta: completedDelta,
    _rejected_delta: rejectedDelta,
    _note: note ?? null,
  } as never);
  if (error) throw error;
}

export async function setStageStatus(stageId: string, status: StageStatus, note?: string) {
  const { error } = await supabase.rpc("factory_set_stage_status", {
    _stage_id: stageId,
    _status: status,
    _note: note ?? null,
  } as never);
  if (error) throw error;
}

// ---------------- Workers ----------------
export async function listWorkers(dept?: FactoryDept): Promise<FactoryWorker[]> {
  let q = supabase.from("factory_workers").select("*").order("full_name");
  if (dept) q = q.eq("department", dept);
  const { data, error } = await q;
  if (error) throw error;
  return data as FactoryWorker[];
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createWorker(w: {
  full_name: string; worker_code: string; pin: string; department: FactoryDept; phone?: string | null;
}) {
  const pin_hash = await sha256(w.pin);
  const { error } = await supabase.from("factory_workers").insert({
    full_name: w.full_name,
    worker_code: w.worker_code,
    pin_hash,
    department: w.department,
    phone: w.phone ?? null,
  } as never);
  if (error) throw error;
}

export async function deleteWorker(id: string) {
  const { error } = await supabase.from("factory_workers").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleWorker(id: string, active: boolean) {
  const { error } = await supabase.from("factory_workers").update({ active } as never).eq("id", id);
  if (error) throw error;
}

// ---------------- Dashboard summary ----------------
export async function dashboardSummary() {
  const [{ data: orders }, { data: stages }] = await Promise.all([
    supabase.from("factory_orders").select("id,status,total_quantity,created_at"),
    supabase.from("factory_stages").select("department,status,planned_quantity,completed_quantity,rejected_quantity"),
  ]);
  return {
    orders: (orders ?? []) as Pick<FactoryOrder, "id" | "status" | "total_quantity" | "created_at">[],
    stages: (stages ?? []) as Pick<FactoryStage, "department" | "status" | "planned_quantity" | "completed_quantity" | "rejected_quantity">[],
  };
}
