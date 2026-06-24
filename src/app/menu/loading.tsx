"use client";

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top nav skeleton */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-6 w-32 bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Search bar skeleton */}
        <div className="h-11 w-full bg-muted rounded-xl animate-pulse" />

        {/* Category pills skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Menu item cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="h-36 bg-muted rounded-xl animate-pulse" />
              <div className="h-5 w-3/4 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-1/2 bg-muted rounded-lg animate-pulse" />
              <div className="flex justify-between items-center">
                <div className="h-6 w-16 bg-muted rounded-lg animate-pulse" />
                <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
