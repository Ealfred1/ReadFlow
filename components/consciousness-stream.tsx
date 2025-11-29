"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowRight, Waves, Brain, Headphones } from "lucide-react"

interface ConsciousnessStreamProps {
  onEnter: () => void
}

export function ConsciousnessStream({ onEnter }: ConsciousnessStreamProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const features = [
    { icon: Waves, title: "Voice Synthesis", desc: "AI transforms text into consciousness" },
    { icon: Brain, title: "Neural Insights", desc: "Extract wisdom from any document" },
    { icon: Headphones, title: "Ambient Learning", desc: "Absorb knowledge while you flow" },
  ]

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      {/* Interactive cursor trail */}
      <div
        className="fixed w-64 h-64 rounded-full pointer-events-none transition-transform duration-300 ease-out z-0"
        style={{
          left: mousePosition.x - 128,
          top: mousePosition.y - 128,
          background: `radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)`,
        }}
      />

      {/* Main title with dimensional effect */}
      <div className="relative mb-16">
        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-center">
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-chart-5">
            ReadFlow
          </span>
          <span className="block text-foreground/20 text-4xl md:text-6xl mt-2 tracking-widest">AI</span>
        </h1>

        {/* Floating dimensional rings */}
        <div className="absolute -inset-20 flex items-center justify-center pointer-events-none">
          <div
            className="w-[400px] h-[400px] border border-primary/20 rounded-full animate-spin"
            style={{ animationDuration: "20s" }}
          />
          <div
            className="absolute w-[300px] h-[300px] border border-accent/20 rounded-full animate-spin"
            style={{ animationDuration: "15s", animationDirection: "reverse" }}
          />
          <div
            className="absolute w-[200px] h-[200px] border border-chart-5/20 rounded-full animate-spin"
            style={{ animationDuration: "10s" }}
          />
        </div>
      </div>

      {/* Tagline */}
      <p className="text-xl md:text-2xl text-muted-foreground text-center max-w-2xl mb-12 leading-relaxed">
        Transform any document into a <span className="text-primary">stream of consciousness</span>.
        <br />
        Listen, learn, and never lose your place in the cosmos of knowledge.
      </p>

      {/* Enter portal button */}
      <button
        onClick={onEnter}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "group relative px-12 py-6 rounded-full transition-all duration-500",
          "bg-gradient-to-r from-primary/20 to-accent/20",
          "border border-primary/50 backdrop-blur-xl",
          "hover:shadow-[0_0_60px_rgba(168,85,247,0.5)]",
          "hover:scale-105",
        )}
      >
        <span className="relative z-10 flex items-center gap-3 text-xl font-medium text-foreground">
          Enter the Flow
          <ArrowRight className={cn("w-6 h-6 transition-transform duration-300", isHovering && "translate-x-2")} />
        </span>

        {/* Animated border */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-chart-5 opacity-50 animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <div className="absolute inset-[2px] rounded-full bg-background" />
        </div>
      </button>

      {/* Feature cards - floating */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className={cn(
                "group p-8 rounded-3xl transition-all duration-500",
                "bg-card/30 backdrop-blur-xl border border-border/50",
                "hover:border-primary/50 hover:bg-card/50",
                "hover:shadow-[0_20px_60px_rgba(168,85,247,0.2)]",
                "hover:-translate-y-2",
              )}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
