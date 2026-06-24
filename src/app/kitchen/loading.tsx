"use client";

export default function KitchenLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top nav skeleton */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-6 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <div className="h-4 w-20 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-12 bg-muted rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Order queue skeleton */}
        <div className="space-y-3">
          <div className="h-6 w-36 bg-muted rounded-lg animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-muted rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
                <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
