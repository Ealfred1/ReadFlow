"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ViewState } from "@/app/page"
import { Home, Upload, BookOpen, Sparkles } from "lucide-react"

interface NavigationOrbProps {
  currentView: ViewState
  onNavigate: (view: ViewState) => void
}

const navItems: { id: ViewState; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: Home, label: "Consciousness" },
  { id: "upload", icon: Upload, label: "Portal" },
  { id: "reader", icon: BookOpen, label: "Dimension" },
  { id: "insights", icon: Sparkles, label: "Synthesis" },
]

export function NavigationOrb({ currentView, onNavigate }: NavigationOrbProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="fixed top-6 left-6 z-40">
      {/* Central orb */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative w-14 h-14 rounded-full transition-all duration-500",
          "bg-gradient-to-br from-primary/30 to-accent/30",
          "border border-primary/50 backdrop-blur-xl",
          "hover:scale-110 hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]",
          "flex items-center justify-center",
          isExpanded && "scale-110 shadow-[0_0_60px_rgba(168,85,247,0.6)]",
        )}
      >
        <div
          className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 animate-spin"
          style={{ animationDuration: "8s" }}
        />
        <span className="relative z-10 text-xl font-bold text-foreground">RF</span>
      </button>

      {/* Orbital navigation items */}
      {navItems.map((item, index) => {
        const Icon = item.icon
        const angle = index * 90 - 45
        const radius = isExpanded ? 70 : 0
        const x = Math.cos((angle * Math.PI) / 180) * radius
        const y = Math.sin((angle * Math.PI) / 180) * radius

        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id)
              setIsExpanded(false)
            }}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-10 h-10 rounded-full transition-all duration-500",
              "bg-card/80 backdrop-blur-xl border border-border",
              "hover:border-primary hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]",
              "flex items-center justify-center",
              currentView === item.id && "border-primary bg-primary/20",
              !isExpanded && "opacity-0 scale-0",
            )}
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              transitionDelay: `${index * 50}ms`,
            }}
          >
            <Icon className="w-4 h-4 text-foreground" />
          </button>
        )
      })}
    </div>
  )
}
