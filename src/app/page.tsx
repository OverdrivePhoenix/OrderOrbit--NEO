import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { DynamicMagicRings, DynamicHeroScroll } from "@/components/DynamicHome";

export const metadata = {
  title: "OrderOrbit - College Canteen Pre-Order",
  description: "Modern campus dining pre-order and feedback ecosystem.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* Magic Rings Canvas Background — loaded dynamically, no SSR */}
      <DynamicMagicRings />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 h-20 flex justify-between items-center border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-2xl text-primary tracking-tight bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
            OrderOrbit
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-surface-tint text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-grow flex flex-col">
        {/* Hero animation — loaded dynamically, no SSR */}
        <DynamicHeroScroll />

        {/* Footer feature list */}
        <section className="bg-white/60 dark:bg-black/40 backdrop-blur-md py-16 px-6 border-t border-outline-variant/10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined text-2xl">restaurant</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Live Menu Updates</h3>
              <p className="text-on-surface-variant text-sm">
                Inspect live inventory counts and estimated cooking times before walking down to the canteen.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4">
                <span className="material-symbols-outlined text-2xl">credit_card</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Pre-Ordering</h3>
              <p className="text-on-surface-variant text-sm">
                Reserve stock and pay securely with Stripe Checkout. FIFO locking ensures no over-ordering.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
              <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary mb-4">
                <span className="material-symbols-outlined text-2xl">campaign</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Actionable AI Insights</h3>
              <p className="text-on-surface-variant text-sm">
                Direct item scoring limits complaints, compiled daily by Gemini Flash for kitchen adjustments.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-outline-variant/10 text-center text-xs text-on-surface-variant">
        <p>© 2026 OrderOrbit Ecosystem. B.Tech S3 Engineering Team Project.</p>
      </footer>
    </div>
  );
}
