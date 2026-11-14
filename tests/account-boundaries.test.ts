import { expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const token = process.env.FINES_TEST_TOKEN;
const url = process.env.FINES_TEST_URL;
const key = process.env.FINES_TEST_KEY;
const account = "cc393332-0806-4ef2-b344-54262eb31998";
const foreignWorker = "28008ff5-49b3-4b0d-a8c0-82ec211df5c0";

function client() {
  if (!token || !url || !key) throw new Error("Missing test session");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}

test.skipIf(!token || !url || !key)("all sewing data reads contain only the signed-in account", async () => {
  for (const table of ["workers", "products", "categories", "assignments", "attendance", "payroll_periods", "fines"]) {
    const { data, error } = await client().from(table).select("user_id").limit(1000);
    expect(error).toBeNull();
    expect((data ?? []).every(row => row.user_id === account)).toBe(true);
  }
  const { data } = await client().from("workers").select("id").eq("id", foreignWorker);
  expect(data).toEqual([]);
});

test.skipIf(!token || !url || !key)("cross-account fines and assignment references are rejected", async () => {
  const { error: fineError } = await client().from("fines").insert({ user_id: account, worker_id: foreignWorker, amount: 1, date: "2026-11-14" });
  expect(fineError).not.toBeNull();
  const { error: assignmentError } = await client().from("assignments").update({ worker_id: foreignWorker }).eq("id", "9c02247d-5ac4-4ab8-8645-efbec329443e");
  expect(assignmentError?.message).toContain("cross_account_reference_denied");
});

test.skipIf(!token || !url || !key)("legacy shared data is quarantined and accounts cannot grant themselves roles", async () => {
  for (const table of ["factory_workers", "factory_products", "factory_orders", "pullers_workers", "inventory_materials"]) {
    const { data, error } = await client().from(table).select("account_id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }
  const { error } = await client().from("user_roles").insert({ user_id: account, role: "admin" });
  expect(error).not.toBeNull();
  const { data, error: salaryError } = await client().rpc("factory_worker_salary", { _from: "2026-01-01", _to: "2026-12-31" });
  expect(salaryError).toBeNull();
  expect(data).toEqual([]);
});