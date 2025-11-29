"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft, Brain, Lightbulb, Target, Zap, BookOpen } from "lucide-react"

interface WaveformVisualizerProps {
  onBack: () => void
}

export function WaveformVisualizer({ onBack }: WaveformVisualizerProps) {
  const [activeInsight, setActiveInsight] = useState(0)
  const [neuralPulse, setNeuralPulse] = useState<number[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setNeuralPulse(
        Array(100)
          .fill(0)
          .map(() => Math.random()),
      )
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const insights = [
    {
      icon: Brain,
      title: "Chapter Summary",
      content:
        "This chapter explores the fundamental principle that the greatest victory comes from winning without direct confrontation. Sun Tzu emphasizes the importance of strategic planning over brute force, suggesting that true mastery lies in outmaneuvering opponents through wisdom rather than warfare.",
      color: "from-primary to-primary/50",
    },
    {
      icon: Lightbulb,
      title: "Key Insights",
      content:
        "• Strategy precedes tactics in all successful endeavors\n• Understanding your opponent's psychology is crucial\n• Resources should be preserved, not depleted\n• Timing and positioning often matter more than strength",
      color: "from-accent to-accent/50",
    },
    {
      icon: Target,
      title: "Practical Applications",
      content:
        "In business: Analyze competitors thoroughly before acting. In negotiations: Seek win-win outcomes. In personal growth: Focus energy on high-leverage activities. In leadership: Inspire rather than command.",
      color: "from-chart-3 to-chart-3/50",
    },
    {
      icon: Zap,
      title: "Action Items",
      content:
        "1. Create a strategic assessment framework\n2. Identify areas where you can achieve goals without confrontation\n3. Develop patience in decision-making\n4. Practice seeing situations from multiple perspectives",
      color: "from-chart-5 to-chart-5/50",
    },
  ]

  return (
    <div className="relative z-10 min-h-screen p-6">
      {/* Neural network background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <svg className="w-full h-full opacity-20">
          {neuralPulse.map((pulse, i) => {
            const x = (i % 10) * 10 + 5
            const y = Math.floor(i / 10) * 10 + 5
            return (
              <circle
                key={i}
                cx={`${x}%`}
                cy={`${y}%`}
                r={pulse * 3 + 1}
                fill="url(#neural-gradient)"
                className="transition-all duration-100"
              />
            )
          })}
          <defs>
            <radialGradient id="neural-gradient">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.8)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 mb-12">
        <button
          onClick={onBack}
          className="p-3 rounded-full bg-card/30 border border-border/30 hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-chart-5">
            AI Synthesis
          </h1>
          <p className="text-muted-foreground mt-1">Neural analysis of "The Art of War" • Chapter 3</p>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Insight selector - orbital style */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            {/* Central orb */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/50 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>

            {/* Orbiting insight buttons */}
            {insights.map((insight, index) => {
              const Icon = insight.icon
              const angle = index * 90 - 45
              const radius = 100
              const x = Math.cos((angle * Math.PI) / 180) * radius
              const y = Math.sin((angle * Math.PI) / 180) * radius

              return (
                <button
                  key={index}
                  onClick={() => setActiveInsight(index)}
                  className={cn(
                    "absolute top-1/2 left-1/2 w-14 h-14 rounded-full transition-all duration-300",
                    "flex items-center justify-center",
                    "bg-card/50 backdrop-blur-xl border",
                    activeInsight === index
                      ? "border-primary shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-110"
                      : "border-border/50 hover:border-primary/50",
                  )}
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-colors",
                      activeInsight === index ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Active insight display */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Main insight card */}
          <div
            className={cn(
              "p-8 rounded-3xl transition-all duration-500",
              "bg-card/30 backdrop-blur-xl border border-border/30",
              "hover:border-primary/30",
            )}
          >
            <div
              className={cn(
                "inline-flex items-center gap-3 px-4 py-2 rounded-full mb-6",
                "bg-gradient-to-r",
                insights[activeInsight].color,
              )}
            >
              {(() => {
                const Icon = insights[activeInsight].icon
                return <Icon className="w-5 h-5 text-foreground" />
              })()}
              <span className="text-sm font-medium text-foreground">{insights[activeInsight].title}</span>
            </div>
            <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{insights[activeInsight].content}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Reading Progress", value: "34%", sub: "53 of 156 pages" },
              { label: "Time Invested", value: "2.4h", sub: "This week" },
              { label: "Insights Generated", value: "12", sub: "Across 3 chapters" },
              { label: "Notes Created", value: "8", sub: "2 highlights" },
            ].map((stat, i) => (
              <div
                key={i}
                className={cn(
                  "p-6 rounded-2xl transition-all duration-300",
                  "bg-card/20 backdrop-blur-xl border border-border/30",
                  "hover:border-primary/30 hover:bg-card/30",
                )}
              >
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {stat.value}
                </p>
                <p className="text-sm text-foreground mt-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Q&A Section */}
        <div className="mt-12 p-8 rounded-3xl bg-card/20 backdrop-blur-xl border border-border/30">
          <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" />
            Ask the Book
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="What did Sun Tzu say about timing in battle?"
              className="w-full px-6 py-4 rounded-2xl bg-card/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all">
              Ask AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
