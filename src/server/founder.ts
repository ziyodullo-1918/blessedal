import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Founder login: validates login_id + PIN, then generates a magic link for the
 * owning admin user and returns the access/refresh tokens so the client can
 * set the Supabase session and access the admin's data via RLS.
 */
export const founderLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { login_id: string; pin: string }) => {
    if (!input?.login_id || !input?.pin) throw new Error("login_id va pin kerak");
    if (typeof input.login_id !== "string" || input.login_id.length > 64) throw new Error("Noto'g'ri login");
    if (!/^\d{4,8}$/.test(input.pin)) throw new Error("PIN 4-8 raqam bo'lishi kerak");
    return { login_id: input.login_id.trim(), pin: input.pin };
  })
  .handler(async ({ data }) => {
    const pinHash = await sha256(data.pin);

    // Look up founder
    const { data: founder, error } = await supabaseAdmin
      .from("founders")
      .select("admin_user_id, pin_hash, full_name, login_id")
      .eq("login_id", data.login_id)
      .maybeSingle();

    if (error) throw new Error("Server xatosi");
    if (!founder || founder.pin_hash !== pinHash) {
      throw new Error("Login yoki PIN noto'g'ri");
    }

    // Get admin email
    const { data: adminUser, error: adminErr } =
      await supabaseAdmin.auth.admin.getUserById(founder.admin_user_id);
    if (adminErr || !adminUser?.user?.email) {
      throw new Error("Administrator topilmadi");
    }

    // Generate magic link tokens for admin
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: adminUser.user.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error("Sessiya ololmadi");
    }

    return {
      email: adminUser.user.email,
      token_hash: link.properties.hashed_token,
      verification_type: link.properties.verification_type ?? "magiclink",
      founder_name: founder.full_name,
      login_id: founder.login_id,
    };
  });
