import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ConfirmDialog";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Sahifa topilmadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Bosh sahifa
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Blessed Al — Boshqaruv" },
      { name: "description", content: "Blessed Al ishlab chiqarish: ishchilar, mahsulotlar va oylik hisobotlarni boshqarish tizimi." },
      { property: "og:title", content: "Blessed Al — Boshqaruv" },
      { name: "twitter:title", content: "Blessed Al — Boshqaruv" },
      { property: "og:description", content: "Blessed Al ishlab chiqarish: ishchilar, mahsulotlar va oylik hisobotlarni boshqarish tizimi." },
      { name: "twitter:description", content: "Blessed Al ishlab chiqarish: ishchilar, mahsulotlar va oylik hisobotlarni boshqarish tizimi." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0a822c3-3328-48f8-9729-18cca8f46996/id-preview-4fb37a93--8cbb6df7-1142-4581-9862-ec1aff19cb36.lovable.app-1776461346805.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0a822c3-3328-48f8-9729-18cca8f46996/id-preview-4fb37a93--8cbb6df7-1142-4581-9862-ec1aff19cb36.lovable.app-1776461346805.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <HeadContent />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ConfirmProvider>
      <Outlet />
    </ConfirmProvider>
  );
}
