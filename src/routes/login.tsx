import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setWorkerSession } from "@/lib/tortuvchilar/worker-session";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Kirish — Blessed Al" },
      { name: "description", content: "Boshqaruv panelga kirish." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, signInAsFounder, user, loading, role } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"admin" | "founder" | "puller">("admin");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [workerCode, setWorkerCode] = useState("");
  const [workerPin, setWorkerPin] = useState("");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    if (!loading && user) {
      navigate({ to: role === "founder" ? "/topshiriqlar" : "/" });
    }
  }, [loading, user, role, navigate]);

  async function submitAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) return toast.error(error);
    if (mode === "signup") {
      toast.success("Hisob yaratildi. Endi tizimga kiring.");
      setMode("signin");
    } else {
      toast.success("Xush kelibsiz!");
      navigate({ to: "/" });
    }
  }

  async function submitFounder(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim()) return toast.error("Login ID kiriting");
    if (pin.length !== 4) return toast.error("4 raqamli PIN kiriting");
    setBusy(true);
    const { error } = await signInAsFounder(loginId, pin);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Xush kelibsiz!");
    navigate({ to: "/topshiriqlar" });
  }

  async function submitPuller(e: React.FormEvent) {
    e.preventDefault();
    if (!workerCode.trim() || !workerPin.trim()) return toast.error("ID va PIN kiriting");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("pullers_worker_login", {
        _code: workerCode.trim().toUpperCase(),
        _pin: workerPin.trim(),
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) {
        toast.error("ID yoki PIN noto'g'ri");
        return;
      }
      setWorkerSession({
        id: row.id,
        worker_code: row.worker_code,
        name: row.name,
        token: row.session_token,
        expires_at: row.expires_at,
      });
      toast.success(`Salom, ${row.name}`);
      navigate({ to: "/tortuvchilar/worker" });
    } catch (err: any) {
      toast.error(err.message ?? "Kirish xatosi");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-foreground p-10 text-background">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-display text-2xl">
            B
          </div>
          <span className="font-display text-2xl tracking-wide">BLESSED AL</span>
        </div>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Ishlab chiqarish.<br />Soddalashtirilgan.
          </h1>
          <p className="mt-4 max-w-md text-sm opacity-70">
            Ishchilar, mahsulotlar va topshiriqlarni bir joyda boshqaring.
            Maoshlar avtomatik hisoblanadi.
          </p>
        </div>
        <div className="text-xs opacity-50">© Blessed Al Boshqaruv Tizimi</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl">Tizimga kirish</h2>
          <p className="mt-1 text-sm text-muted-foreground">Rolni tanlang.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="founder">Ta'sischi</TabsTrigger>
              <TabsTrigger value="puller">Tortuvchi</TabsTrigger>
            </TabsList>


            <TabsContent value="admin">
              <form onSubmit={submitAdmin} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="manager@cex.uz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <Input id="password" type="password" required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Kuting…" : mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish"}
                </Button>
                <button type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  {mode === "signin" ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : "Hisobingiz bormi? Kirish"}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="founder">
              <form onSubmit={submitFounder} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login_id">Login ID</Label>
                  <Input id="login_id" required value={loginId}
                    onChange={(e) => setLoginId(e.target.value)} placeholder="masalan: ali" />
                </div>
                <div className="space-y-2">
                  <Label>PIN (4 raqam)</Label>
                  <InputOTP maxLength={4} value={pin} onChange={setPin}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Kuting…" : "Kirish"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Login va PIN ni administrator beradi
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
