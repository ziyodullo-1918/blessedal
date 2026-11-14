import { expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const token = process.env.FINES_TEST_TOKEN;
const url = process.env.FINES_TEST_URL;
const key = process.env.FINES_TEST_KEY;

test.skipIf(!token || !url || !key)("930,000 in another account's fines cannot enter this account's payroll", async () => {
  if (!token || !url || !key) throw new Error("Missing test session");
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await client.auth.getUser(token);
  expect(authError).toBeNull();
  expect(auth.user?.id).toBe("cc393332-0806-4ef2-b344-54262eb31998");
  const { data: fines, error } = await client.from("fines").select("amount,date,worker:workers(user_id)");
  expect(error).toBeNull();
  expect(fines).toHaveLength(2);
  for (const fine of fines ?? []) {
    expect(fine.worker).toEqual({ user_id: auth.user?.id });
  }
  expect((fines ?? []).reduce((sum, fine) => sum + Number(fine.amount), 0)).toBe(200000);
  const current = (fines ?? []).filter((fine) => fine.date >= "2026-10-31" && fine.date <= "2026-11-29");
  expect(current.reduce((sum, fine) => sum + Number(fine.amount), 0)).toBe(0);
});