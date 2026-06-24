"use client";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-background">
      <div className="w-full max-w-md px-6">
        <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center">
          {/* Logo skeleton */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-muted animate-pulse mb-3" />
            <div className="h-7 w-32 bg-muted rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-48 bg-muted rounded-lg animate-pulse" />
          </div>

          {/* Role selector skeleton */}
          <div className="w-full bg-muted rounded-xl p-1 flex mb-6 h-11 animate-pulse" />

          {/* Form fields skeleton */}
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
              <div className="h-11 w-full bg-muted rounded-xl animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-11 w-full bg-muted rounded-xl animate-pulse" />
            </div>
            <div className="h-12 w-full bg-muted rounded-xl animate-pulse mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
