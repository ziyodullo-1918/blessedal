import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { usePin } from "@/lib/pin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Lock, ShieldCheck, Smartphone, UserPlus, Trash2, KeyRound, Users } from "lucide-react";
import { listFounders, createFounder, deleteFounder, updateFounderPin, type Founder } from "@/lib/data";

export const Route = createFileRoute("/sozlamalar")({
  component: () => (
    <RequireAuth>
      <Page />
    </RequireAuth>
  ),
});

function Page() {
  const { enabled, setPin, disablePin } = usePin();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    if (newPin.length !== 4) return toast.error("4 raqamli PIN kiriting");
    if (newPin !== confirmPin) return toast.error("PIN mos kelmadi");
    setBusy(true);
    await setPin(newPin);
    setBusy(false);
    setNewPin("");
    setConfirmPin("");
    toast.success("PIN o'rnatildi");
  };

  const handleDisable = async () => {
    if (currentPin.length !== 4) return toast.error("Joriy PIN ni kiriting");
    setBusy(true);
    const ok = await disablePin(currentPin);
    setBusy(false);
    setCurrentPin("");
    if (ok) toast.success("PIN o'chirildi");
    else toast.error("PIN noto'g'ri");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Sozlamalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Xavfsizlik, ta'sischilar va ilova sozlamalari</p>
      </div>

      <FoundersCard />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4" /> PIN kod qulfi
              </CardTitle>
              <CardDescription>Ilovani ochishda 4 raqamli PIN so'raladi</CardDescription>
            </div>
            <Switch checked={enabled} disabled />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!enabled ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Yangi PIN (4 raqam)</Label>
                <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                    <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-2">
                <Label>PIN ni tasdiqlang</Label>
                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                    <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleEnable} disabled={busy}>
                <ShieldCheck className="size-4" /> PIN ni yoqish
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">PIN faol. O'chirish uchun joriy PIN ni kiriting.</p>
              <div className="space-y-2">
                <Label>Joriy PIN</Label>
                <InputOTP maxLength={4} value={currentPin} onChange={setCurrentPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                    <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button variant="destructive" onClick={handleDisable} disabled={busy}>
                PIN ni o'chirish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-4" /> Telefonga o'rnatish
          </CardTitle>
          <CardDescription>Ilovani telefon ekraniga yorliq sifatida qo'shing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Android (Chrome):</strong> menyu (⋮) → "Bosh ekranga qo'shish".</p>
          <p><strong className="text-foreground">iPhone (Safari):</strong> Ulashish tugmasi → "Bosh ekranga qo'shish".</p>
          <p>Ochilgandan keyin ilova xuddi APK kabi alohida oynada ishlaydi.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function FoundersCard() {
  const confirmDialog = useConfirm();
  const [items, setItems] = useState<Founder[]>([]);
  const [loginId, setLoginId] = useState("");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPin, setEditPin] = useState("");

  const load = () => listFounders().then(setItems).catch(console.error);
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim() || !fullName.trim()) return toast.error("Login ID va ism kiriting");
    if (pin.length !== 4) return toast.error("4 raqamli PIN");
    setBusy(true);
    try {
      await createFounder({ login_id: loginId, full_name: fullName, pin });
      toast.success("Ta'sischi qo'shildi");
      setLoginId(""); setFullName(""); setPin("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: "Ta'sischini o'chirasizmi?",
      description: "U boshqa tizimga kira olmaydi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    await deleteFounder(id);
    toast.success("O'chirildi");
    load();
  }

  async function savePin(id: string) {
    if (editPin.length !== 4) return toast.error("4 raqamli PIN");
    await updateFounderPin(id, editPin);
    toast.success("PIN yangilandi");
    setEditingId(null); setEditPin("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" /> Ta'sischilar
        </CardTitle>
        <CardDescription>
          Ta'sischilar faqat <strong>Topshiriqlar</strong> bo'limini ko'rishi va ishlashi mumkin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Login ID</Label>
            <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ali" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ism</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ali Valiyev" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">PIN (4 raqam)</Label>
            <InputOTP maxLength={4} value={pin} onChange={setPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                <InputOTPSlot index={2} /><InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={busy}>
              <UserPlus className="size-4" /> Qo'shish
            </Button>
          </div>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hech qanday ta'sischi yo'q.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {items.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium">{f.full_name}</div>
                  <div className="text-xs text-muted-foreground">Login: <code>{f.login_id}</code></div>
                </div>
                {editingId === f.id ? (
                  <div className="flex items-center gap-2">
                    <InputOTP maxLength={4} value={editPin} onChange={setEditPin}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                        <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                    <Button size="sm" onClick={() => savePin(f.id)}>Saqlash</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditPin(""); }}>Bekor</Button>
                  </div>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(f.id); setEditPin(""); }}>
                      <KeyRound className="size-4" /> PIN
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
