import { supabase } from "@/integrations/supabase/client";
import type { FactoryDept } from "@/lib/factory/data";

export type DeptHead = {
  id: string;
  department: FactoryDept;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_at: string;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: "admin" | "head" | "worker";
  department: FactoryDept | null;
  created_at: string;
};

export type FactoryProfile = {
  name: string;
  address: string;
  phone: string;
};

export async function listDeptHeads(): Promise<DeptHead[]> {
  const { data, error } = await supabase
    .from("factory_department_heads" as never)
    .select("*")
    .order("department");
  if (error) throw error;
  return (data ?? []) as unknown as DeptHead[];
}

export async function upsertDeptHead(h: {
  department: FactoryDept;
  full_name: string;
  email?: string | null;
  phone?: string | null;
}) {
  const { error } = await supabase
    .from("factory_department_heads" as never)
    .upsert(
      {
        department: h.department,
        full_name: h.full_name,
        email: h.email ?? null,
        phone: h.phone ?? null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "department" } as never,
    );
  if (error) throw error;
}

export async function deleteDeptHead(id: string) {
  const { error } = await supabase.from("factory_department_heads" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function listRoles(): Promise<UserRoleRow[]> {
  const { data, error } = await supabase
    .from("user_roles" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UserRoleRow[];
}

export async function addRole(input: { user_id: string; role: "admin" | "head" | "worker"; department?: FactoryDept | null }) {
  const { error } = await supabase
    .from("user_roles" as never)
    .insert({
      user_id: input.user_id,
      role: input.role,
      department: input.department ?? null,
    } as never);
  if (error) throw error;
}

export async function deleteRole(id: string) {
  const { error } = await supabase.from("user_roles" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings" as never)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return ((data as { value: T } | null)?.value ?? null) as T | null;
}

export async function setSetting(key: string, value: unknown) {
  const { error } = await supabase
    .from("app_settings" as never)
    .upsert(
      { key, value, updated_at: new Date().toISOString() } as never,
      { onConflict: "key" } as never,
    );
  if (error) throw error;
}
