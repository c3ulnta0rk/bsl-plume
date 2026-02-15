import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTournamentLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-9 w-72" />
          <Skeleton className="mb-1 h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      <div className="my-6 h-px bg-border" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <Skeleton className="mb-6 h-10 w-96" />

      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="mb-3 h-6 w-40" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
