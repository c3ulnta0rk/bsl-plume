import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="mb-2 h-9 w-72" />
          <Skeleton className="mb-1 h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-28" />
      </div>

      <div className="my-6 h-px bg-border" />

      <Skeleton className="mb-6 h-10 w-80" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
