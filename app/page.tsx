//import { useMutation, useQuery } from "convex/react";
//import { api } from "../convex/_generated/api";
//import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 p-4 border-b-2 flex flex-row justify-between items-center" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
        <span className="font-bold" style={{ color: 'var(--foreground)' }}>Convex + Next.js</span>
        <AnimatedThemeToggler />
      </header>
      <main className="p-8 flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold text-center" style={{ color: 'var(--foreground)' }}>
          Theme Testing
        </h1>
        
        {/* Test color variables */}
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          <div className="p-6 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
            <h2 className="text-xl font-semibold mb-2">Background & Foreground</h2>
            <p>This tests the basic background and foreground colors.</p>
          </div>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>
            <h2 className="text-xl font-semibold mb-2">Primary Color</h2>
            <p>This shows the primary accent color.</p>
          </div>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--secondary)', color: 'white' }}>
            <h2 className="text-xl font-semibold mb-2">Secondary Color</h2>
            <p>This shows the secondary accent color.</p>
          </div>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }}>
            <h2 className="text-xl font-semibold mb-2">Accent Color</h2>
            <p>This shows the accent color for special elements.</p>
          </div>
          
          <div className="p-6 rounded-lg border-2" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <h2 className="text-xl font-semibold mb-2">Border Color</h2>
            <p>This demonstrates the border color variable.</p>
          </div>
        </div>
        
        <p className="text-sm" style={{ color: 'var(--secondary)' }}>
          Click the theme toggle in the header to see the animated transition!
        </p>
      </main>
    </>
  );
}
