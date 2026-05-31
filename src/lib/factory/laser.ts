import { supabase } from "@/integrations/supabase/client";

export type LaserRate = {
  id: string;
  worker_id: string | null;
  rate_per_day: number;
  active: boolean;
  effective_from: string;
  created_at: string;
};

export type LaserAttendance = {
  id: string;
  worker_id: string;
  work_date: string;
  daily_rate: number;
  note: string | null;
  created_at: string;
};

export type LaserSalaryRow = {
  worker_id: string;
  worker_name: string | null;
  total_days: number;
  total_amount: number;
};

export async function listLaserRates(): Promise<LaserRate[]> {
  const { data, error } = await supabase
    .from("laser_daily_rates").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LaserRate[];
}

export async function upsertLaserRate(r: { id?: string; worker_id: string | null; rate_per_day: number; active?: boolean }) {
  if (r.id) {
    const { error } = await supabase.from("laser_daily_rates")
      .update({ worker_id: r.worker_id, rate_per_day: r.rate_per_day, active: r.active ?? true } as never)
      .eq("id", r.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("laser_daily_rates").insert({
      worker_id: r.worker_id,
      rate_per_day: r.rate_per_day,
      active: r.active ?? true,
    } as never);
    if (error) throw error;
  }
}

export async function deleteLaserRate(id: string) {
  const { error } = await supabase.from("laser_daily_rates").delete().eq("id", id);
  if (error) throw error;
}

export async function defaultLaserRate(workerId: string): Promise<number> {
  const { data } = await supabase.from("laser_daily_rates").select("rate_per_day")
    .eq("active", true).or(`worker_id.eq.${workerId},worker_id.is.null`).order("worker_id", { nullsFirst: false }).limit(1);
  return Number((data?.[0] as { rate_per_day?: number } | undefined)?.rate_per_day ?? 0);
}

export async function listLaserAttendance(from: string, to: string): Promise<LaserAttendance[]> {
  const { data, error } = await supabase.from("laser_daily_attendance")
    .select("*").gte("work_date", from).lte("work_date", to)
    .order("work_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LaserAttendance[];
}

export async function recordLaserAttendance(workerId: string, date: string, rate: number, note?: string) {
  const { error } = await supabase.rpc("laser_record_attendance", {
    _worker_id: workerId, _work_date: date, _rate: rate, _note: note ?? null,
  } as never);
  if (error) throw error;
}

export async function deleteLaserAttendance(id: string) {
  const { error } = await supabase.from("laser_daily_attendance").delete().eq("id", id);
  if (error) throw error;
}

export async function laserSalaryReport(from: string, to: string): Promise<LaserSalaryRow[]> {
  const { data, error } = await supabase.rpc("laser_salary_report", { _from: from, _to: to } as never);
  if (error) throw error;
  return (data ?? []) as LaserSalaryRow[];
}
