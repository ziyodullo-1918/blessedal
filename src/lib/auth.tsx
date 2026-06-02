import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const FOUNDER_KEY = "tikuv.founder.session";

export type Role = "admin" | "founder";

type FounderInfo = { name: string; login_id: string };

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: Role;
  founder: FounderInfo | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsFounder: (login_id: string, pin: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [founder, setFounder] = useState<FounderInfo | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(FOUNDER_KEY);
      return raw ? (JSON.parse(raw) as FounderInfo) : null;
    } catch { return null; }
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setFounder(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    role: founder ? "founder" : "admin",
    founder,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        sessionStorage.removeItem(FOUNDER_KEY);
        setFounder(null);
      }
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      return { error: error?.message ?? null };
    },
    signInAsFounder: async (login_id, pin) => {
      try {
        const { founderLogin } = await import("@/lib/founder.functions");
        const res = await founderLogin({ data: { login_id, pin } });
        // Verify the email OTP token to establish a session as the admin user
        const { error } = await supabase.auth.verifyOtp({
          token_hash: res.token_hash,
          type: "email",
        });
        if (error) return { error: error.message };
        const info: FounderInfo = { name: res.founder_name, login_id: res.login_id };
        sessionStorage.setItem(FOUNDER_KEY, JSON.stringify(info));
        setFounder(info);
        return { error: null };
      } catch (e: any) {
        return { error: e?.message ?? "Kirish xatosi" };
      }
    },
    signOut: async () => {
      sessionStorage.removeItem(FOUNDER_KEY);
      setFounder(null);
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
