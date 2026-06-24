"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const LineWaves = dynamic(() => import("@/components/LineWaves"), {
  ssr: false,
});

const HeroScrollDemo = dynamic(
  () => import("@/components/HeroScrollDemo").then((mod) => ({ default: mod.HeroScrollDemo })),
  { ssr: false }
);

export function DynamicLineWaves() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-background" />}>
      <LineWaves
        speed={0.3}
        innerLineCount={32}
        outerLineCount={36}
        warpIntensity={1}
        rotation={-45}
        edgeFadeWidth={0}
        colorCycleSpeed={1}
        brightness={0.2}
        color1="#ffffff"
        color2="#ffffff"
        color3="#ffffff"
        enableMouseInteraction
        mouseInfluence={2}
      />
    </Suspense>
  );
}

export function DynamicHeroScroll() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32">
          <div className="h-10 w-80 bg-muted rounded-xl animate-pulse mb-4" />
          <div className="h-6 w-96 bg-muted rounded-lg animate-pulse" />
        </div>
      }
    >
      <HeroScrollDemo />
    </Suspense>
  );
}
