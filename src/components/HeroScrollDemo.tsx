"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden bg-background py-12">
      <ContainerScroll
        titleComponent={
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight">
              Modernizing Campus Dining with <br />
              <span className="text-5xl md:text-7xl font-extrabold mt-2 leading-none text-primary bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
                OrderOrbit
              </span>
            </h1>
            <p className="text-on-surface-variant max-w-2xl mx-auto mt-4 text-lg">
              Check what's cooking, pre-order in seconds, skip the campus canteen rush, and give direct recipe feedback.
            </p>
          </div>
        }
      >
        <div className="relative w-full h-full bg-gradient-to-b from-surface-container-low to-surface flex flex-col items-center justify-center p-6 text-center">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop"
            alt="OrderOrbit Student Menu Preview"
            className="mx-auto rounded-2xl object-cover h-full w-full opacity-90 shadow-lg border border-outline-variant/30"
            draggable={false}
          />
          <div className="absolute bottom-10 left-10 right-10 bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-left">
            <h3 className="text-xl font-bold text-white mb-2">Live Canteen Dashboard</h3>
            <p className="text-gray-300 text-sm">
              Real-time FIFO token queues, dynamic stock tracking, and item rating metrics aggregated by Gemini AI.
            </p>
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
}
