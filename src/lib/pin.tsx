import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const PIN_KEY = "tikuv.pin.hash";
const PIN_ENABLED = "tikuv.pin.enabled";
const PIN_UNLOCKED = "tikuv.pin.unlocked"; // session

async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Ctx = {
  enabled: boolean;
  unlocked: boolean;
  setPin: (pin: string) => Promise<void>;
  disablePin: (currentPin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
};

const PinCtx = createContext<Ctx | null>(null);

export function PinProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const en = localStorage.getItem(PIN_ENABLED) === "1" && !!localStorage.getItem(PIN_KEY);
    setEnabled(en);
    setUnlocked(!en || sessionStorage.getItem(PIN_UNLOCKED) === "1");
  }, []);

  const setPin = useCallback(async (pin: string) => {
    const h = await sha(pin);
    localStorage.setItem(PIN_KEY, h);
    localStorage.setItem(PIN_ENABLED, "1");
    sessionStorage.setItem(PIN_UNLOCKED, "1");
    setEnabled(true);
    setUnlocked(true);
  }, []);

  const disablePin = useCallback(async (currentPin: string) => {
    const h = await sha(currentPin);
    if (h !== localStorage.getItem(PIN_KEY)) return false;
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(PIN_ENABLED);
    sessionStorage.removeItem(PIN_UNLOCKED);
    setEnabled(false);
    setUnlocked(true);
    return true;
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const h = await sha(pin);
    if (h !== localStorage.getItem(PIN_KEY)) return false;
    sessionStorage.setItem(PIN_UNLOCKED, "1");
    setUnlocked(true);
    return true;
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(PIN_UNLOCKED);
    setUnlocked(false);
  }, []);

  return <PinCtx.Provider value={{ enabled, unlocked, setPin, disablePin, unlock, lock }}>{children}</PinCtx.Provider>;
}

export function usePin() {
  const ctx = useContext(PinCtx);
  if (!ctx) throw new Error("usePin outside provider");
  return ctx;
}

export function PinGate({ children }: { children: ReactNode }) {
  const { enabled, unlocked, unlock } = usePin();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  if (!enabled || unlocked) return <>{children}</>;

  const tryUnlock = async (pin: string) => {
    setBusy(true);
    const ok = await unlock(pin);
    setBusy(false);
    if (!ok) {
      toast.error("PIN noto'g'ri");
      setVal("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <CardTitle>PIN kodni kiriting</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={4}
            value={val}
            onChange={(v) => {
              setVal(v);
              if (v.length === 4) tryUnlock(v);
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <Button disabled={busy || val.length !== 4} onClick={() => tryUnlock(val)} className="w-full">
            Kirish
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
