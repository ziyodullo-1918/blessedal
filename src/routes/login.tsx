import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Kirish — Tikuv Cex" },
      { name: "description", content: "Boshqaruv panelga kirish." },
    ],
  }),
  component: () => (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Hisob yaratildi. Endi tizimga kiring.");
      setMode("signin");
    } else {
      toast.success("Xush kelibsiz!");
      navigate({ to: "/" });
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-foreground p-10 text-background">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-display text-2xl">
            T
          </div>
          <span className="font-display text-2xl tracking-wide">TIKUV CEX</span>
        </div>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Cex boshqaruvi.<br />Soddalashtirilgan.
          </h1>
          <p className="mt-4 max-w-md text-sm opacity-70">
            Ishchilar, mahsulotlar va topshiriqlarni bir joyda boshqaring.
            Maoshlar avtomatik hisoblanadi.
          </p>
        </div>
        <div className="text-xs opacity-50">© Tikuv Cex Boshqaruv Tizimi</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl">
            {mode === "signin" ? "Tizimga kirish" : "Hisob yaratish"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Boshqaruv panelga kirish uchun ma'lumotlaringizni kiriting."
              : "Yangi boshqaruv hisobini yarating."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@cex.uz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Kuting…" : mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
              : "Hisobingiz bormi? Kirish"}
          </button>
        </div>
      </div>
    </div>
  );
}
