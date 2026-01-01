"use client";
import React from "react";
import dynamic from "next/dynamic";
import EndingSoonRail from "@/components/EndingSoonRail";
import AllRifasGrid from "@/components/AllRifasGrid";

const Hero = dynamic(() => import("@/components/Hero"), { ssr: false });
const HowItWorks = dynamic(() => import("@/components/HowItWorks"), { ssr: false });

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <section className="mb-8">
          <Hero />
        </section>

        <section className="mb-8">
          <HowItWorks />
        </section>

        <EndingSoonRail />

        <AllRifasGrid />
      </div>
    </main>
  );
}
