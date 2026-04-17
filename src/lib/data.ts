import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; created_at: string };
export type Product = {
  id: string;
  name: string;
  price_per_unit: number;
  category_id: string | null;
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
export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name)")
    .order("name");
  if (error) throw error;
  return data as unknown as Product[];
}
export async function createProduct(p: { name: string; price_per_unit: number; category_id: string | null }) {
  const user_id = await uid();
  const { error } = await supabase.from("products").insert({ ...p, user_id });
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
export async function deleteWorker(id: string) {
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) throw error;
}

// Assignments
export async function listAssignments(filters?: {
  status?: "in_progress" | "completed";
  workerId?: string;
}): Promise<Assignment[]> {
  let q = supabase
    .from("assignments")
    .select("*, worker:workers(full_name), product:products(name)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.workerId) q = q.eq("worker_id", filters.workerId);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as Assignment[];
}

export async function createAssignment(a: {
  worker_id: string;
  product_id: string;
  quantity: number;
}) {
  const user_id = await uid();
  // Look up unit_price from product
  const { data: prod, error: pe } = await supabase
    .from("products")
    .select("price_per_unit")
    .eq("id", a.product_id)
    .single();
  if (pe) throw pe;
  const { error } = await supabase.from("assignments").insert({
    ...a,
    unit_price: prod.price_per_unit,
    user_id,
    status: "in_progress",
    started_at: new Date().toISOString(),
  });
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
export async function monthlyReport(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, worker:workers(id, full_name), product:products(name)")
    .eq("status", "completed")
    .gte("completed_at", start)
    .lt("completed_at", end);
  if (error) throw error;
  return data as unknown as (Assignment & { worker: { id: string; full_name: string } })[];
}
