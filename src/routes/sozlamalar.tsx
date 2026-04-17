import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useState } from "react";
import { usePin } from "@/lib/pin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock, ShieldCheck, Smartphone } from "lucide-react";

export const Route = createFileRoute("/sozlamalar")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
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
        <p className="mt-1 text-sm text-muted-foreground">Xavfsizlik va ilova sozlamalari</p>
      </div>

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
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-2">
                <Label>PIN ni tasdiqlang</Label>
                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
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
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
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
