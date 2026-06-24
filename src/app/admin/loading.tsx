"use client";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top nav skeleton */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-6 w-44 bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tab bar skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-28 bg-muted rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <div className="h-4 w-24 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-16 bg-muted rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-border/50 flex gap-4 items-center">
              <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-40 bg-muted rounded-lg animate-pulse flex-1" />
              <div className="h-4 w-20 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
