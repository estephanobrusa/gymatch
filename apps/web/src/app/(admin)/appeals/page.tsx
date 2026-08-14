import Link from "next/link";
import { getPendingAppeals } from "@/lib/moderation/queries";
import { AppealReviewCard } from "@/components/admin/AppealReviewCard";

export const metadata = {
  title: "Appeals — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminAppealsPage() {
  const appeals = await getPendingAppeals();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-1">Appeals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {appeals.length} pending
        </p>
      </div>

      <section className="flex flex-col gap-4">
        {appeals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            No pending appeals. 🎉
          </div>
        ) : (
          appeals.map((appeal) => (
            <AppealReviewCard key={appeal.id} appeal={appeal} />
          ))
        )}
      </section>
    </div>
  );
}
