import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings as SettingsIcon, Users, Building2, Boxes, Trash2, Save } from "lucide-react";
import { DEPT_LABEL, type FactoryDept } from "@/lib/factory/data";
import { listDeptHeads, upsertDeptHead, deleteDeptHead, getSetting, setSetting, type DeptHead, type FactoryProfile } from "@/lib/factory/settings";

export const Route = createFileRoute("/factory/settings")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

const DEPTS: FactoryDept[] = ["laser", "sewing", "stretching", "packaging", "warehouse"];

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2"><SettingsIcon className="size-7 text-primary" />Umumiy sozlamalar</h1>
        <p className="text-sm text-muted-foreground">Bo'lim boshliqlari, qadoq qoidalari va zavod profili</p>
      </div>

      <Tabs defaultValue="heads">
        <TabsList>
          <TabsTrigger value="heads"><Users className="size-4 mr-1" />Bo'lim boshliqlari</TabsTrigger>
          <TabsTrigger value="packaging"><Boxes className="size-4 mr-1" />Qadoq qoidalari</TabsTrigger>
          <TabsTrigger value="profile"><Building2 className="size-4 mr-1" />Zavod profili</TabsTrigger>
        </TabsList>

        <TabsContent value="heads" className="mt-4"><DeptHeadsCard /></TabsContent>
        <TabsContent value="packaging" className="mt-4"><PackagingRulesCard /></TabsContent>
        <TabsContent value="profile" className="mt-4"><FactoryProfileCard /></TabsContent>
      </Tabs>
    </div>
  );
}

function DeptHeadsCard() {
  const [heads, setHeads] = useState<DeptHead[]>([]);
  const [dept, setDept] = useState<FactoryDept>("laser");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => listDeptHeads().then(setHeads).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!name.trim()) return toast.error("Ism kiriting");
    setBusy(true);
    try {
      await upsertDeptHead({ department: dept, full_name: name.trim(), phone: phone.trim() || null });
      toast.success("Saqlandi");
      setName(""); setPhone(""); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bo'lim boshliqlari</CardTitle>
        <CardDescription>Admin har bir bo'limga boshliq tayinlaydi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[180px_1fr_1fr_auto]">
          <Select value={dept} onValueChange={(v) => setDept(v as FactoryDept)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPTS.map((d) => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Boshliq ism-familiyasi" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Telefon (ixtiyoriy)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button onClick={save} disabled={busy}><Save className="size-4 mr-1" />Tayinlash</Button>
        </div>

        {heads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hozircha tayinlangan boshliqlar yo'q.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {heads.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="w-24 font-semibold">{DEPT_LABEL[h.department]}</div>
                <div className="flex-1">
                  <div className="font-medium">{h.full_name}</div>
                  {h.phone && <div className="text-xs text-muted-foreground">{h.phone}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm("O'chirilsinmi?")) return;
                  await deleteDeptHead(h.id); refresh();
                }}>
                  <Trash2 className="size-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PackagingRulesCard() {
  const [defaultBox, setDefaultBox] = useState<string>("5");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSetting<{ default_box_size?: number }>("packaging").then((v) => {
      if (v?.default_box_size) setDefaultBox(String(v.default_box_size));
    }).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await setSetting("packaging", { default_box_size: Math.max(1, Number(defaultBox) || 5) });
      toast.success("Saqlandi");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qadoq qoidalari</CardTitle>
        <CardDescription>Yangi mahsulot qo'shilganda standart karobka sig'imi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_auto] items-end max-w-md">
          <div>
            <Label>Standart karobka sig'imi (juft)</Label>
            <Input type="number" min={1} value={defaultBox} onChange={(e) => setDefaultBox(e.target.value)} />
          </div>
          <Button onClick={save} disabled={busy}><Save className="size-4 mr-1" />Saqlash</Button>
        </div>
        <p className="text-xs text-muted-foreground">Har mahsulot uchun alohida sig'im Mahsulotlar bo'limida belgilanadi.</p>
      </CardContent>
    </Card>
  );
}

function FactoryProfileCard() {
  const [profile, setProfile] = useState<FactoryProfile>({ name: "", address: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSetting<FactoryProfile>("factory_profile").then((v) => {
      if (v) setProfile({ name: v.name ?? "", address: v.address ?? "", phone: v.phone ?? "" });
    }).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await setSetting("factory_profile", profile);
      toast.success("Saqlandi");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zavod profili</CardTitle>
        <CardDescription>Hujjatlar va hisobotlarda ishlatiladi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-w-md">
        <div><Label>Zavod nomi</Label><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
        <div><Label>Manzil</Label><Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
        <div><Label>Telefon</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
        <Button onClick={save} disabled={busy}><Save className="size-4 mr-1" />Saqlash</Button>
      </CardContent>
    </Card>
  );
}
