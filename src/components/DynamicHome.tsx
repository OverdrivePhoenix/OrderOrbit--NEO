"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const MagicRings = dynamic(() => import("@/components/MagicRings"), {
  ssr: false,
});

const HeroScrollDemo = dynamic(
  () => import("@/components/HeroScrollDemo").then((mod) => ({ default: mod.HeroScrollDemo })),
  { ssr: false }
);

export function DynamicMagicRings() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-background" />}>
      <div className="absolute inset-0 z-0">
        <MagicRings
          color="#fc42ff"
          colorTwo="#42fcff"
          ringCount={6}
          speed={1}
          attenuation={10}
          lineThickness={2}
          baseRadius={0.35}
          radiusStep={0.1}
          scaleRate={0.1}
          opacity={1}
          blur={0}
          noiseAmount={0.1}
          rotation={0}
          ringGap={1.5}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={true}
          mouseInfluence={0.2}
          hoverScale={1.2}
          parallax={0.05}
          clickBurst={false}
        />
      </div>
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
