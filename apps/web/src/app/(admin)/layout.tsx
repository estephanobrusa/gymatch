import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate: only ADMIN role users may access any /admin route.
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-brand-600">Gymatch</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Admin
          </span>
        </div>
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to app
        </a>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
