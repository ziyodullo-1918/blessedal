import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { listAssignments, listProducts, listWorkers, monthlyReport } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, currentYearMonth } from "@/lib/format";
import { Users, Package, ClipboardList, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    </AuthProvider>
  ),
});

function DashboardPage() {
  const [stats, setStats] = useState({
    workers: 0,
    products: 0,
    inProgress: 0,
    monthSalary: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [workers, products, assignments, report] = await Promise.all([
        listWorkers(),
        listProducts(),
        listAssignments({ status: "in_progress" }),
        monthlyReport(currentYearMonth()),
      ]);
      const monthSalary = report.reduce((s, a) => s + a.quantity * Number(a.unit_price), 0);
      setStats({
        workers: workers.length,
        products: products.length,
        inProgress: assignments.length,
        monthSalary,
      });
      setLoading(false);
    })().catch((e) => console.error(e));
  }, []);

  const cards = [
    { label: "Ishchilar", value: stats.workers, icon: Users },
    { label: "Mahsulotlar", value: stats.products, icon: Package },
    { label: "Jarayonda", value: stats.inProgress, icon: ClipboardList },
    { label: "Bu oy maoshi", value: fmtMoney(stats.monthSalary), icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Boshqaruv paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cex faoliyatining umumiy ko'rinishi
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl">
                  {loading ? "—" : c.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tezkor boshlash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>Mahsulotlar</strong> bo'limida har bir mahsulot va uning birlik narxini qo'shing.</p>
          <p>2. <strong>Ishchilar</strong> bo'limida xodimlarni ro'yxatga oling.</p>
          <p>3. <strong>Hisobot</strong> da yangi davrni boshlang.</p>
          <p>4. <strong>Topshiriqlar</strong> bo'limida ishchiga yarim tayyor mahsulot bering.</p>
          <p>5. Ish tugagach, holatni "Bajarildi" ga o'zgartiring — maosh avtomatik hisoblanadi.</p>
          <p>6. Davr tugaganda Hisobotdan <strong>Davrni tugatish</strong> tugmasini bosing — yangi davr avtomatik ochiladi va jarayondagi topshiriqlar yangi davrga ko'chadi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
