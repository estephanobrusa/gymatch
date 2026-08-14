import { getMatchesAction } from "@/lib/chat/actions";
import { MatchesList } from "@/components/chat/MatchesList";

export default async function MatchesPage() {
  const matches = await getMatchesAction();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Matches</h1>
        <MatchesList matches={matches} />
      </div>
    </main>
  );
}
