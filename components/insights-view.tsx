"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft, Brain, Lightbulb, Target, Zap, BookOpen, Loader2, Send } from "lucide-react"
import { useBookStore } from "@/lib/book-store"
import { generateText } from "ai"

interface InsightsViewProps {
  onBack: () => void
}

export function InsightsView({ onBack }: InsightsViewProps) {
  const { book, currentPage, notes } = useBookStore()
  const [activeInsight, setActiveInsight] = useState(0)
  const [neuralPulse, setNeuralPulse] = useState<number[]>([])
  const [insights, setInsights] = useState<
    Array<{
      icon: typeof Brain
      title: string
      content: string
      color: string
      isLoading: boolean
    }>
  >([
    {
      icon: Brain,
      title: "Chapter Summary",
      content: "",
      color: "from-primary to-primary/50",
      isLoading: true,
    },
    {
      icon: Lightbulb,
      title: "Key Insights",
      content: "",
      color: "from-accent to-accent/50",
      isLoading: true,
    },
    {
      icon: Target,
      title: "Practical Applications",
      content: "",
      color: "from-chart-3 to-chart-3/50",
      isLoading: true,
    },
    {
      icon: Zap,
      title: "Action Items",
      content: "",
      color: "from-chart-5 to-chart-5/50",
      isLoading: true,
    },
  ])

  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isAskingAI, setIsAskingAI] = useState(false)

  // Neural pulse animation
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

  const generateInsights = useCallback(async () => {
    if (!book) return

    // Get text from current and nearby pages for context
    const startPage = Math.max(0, currentPage - 3)
    const endPage = Math.min(book.pages.length, currentPage + 2)
    const contextText = book.pages
      .slice(startPage, endPage)
      .map((p) => p.text)
      .join("\n\n")
      .slice(0, 8000) // Limit context size

    const prompts = [
      {
        index: 0,
        prompt: `Summarize the following text in 2-3 paragraphs. Focus on the main ideas and themes:\n\n${contextText}`,
      },
      {
        index: 1,
        prompt: `Extract 4-5 key insights or lessons from this text. Format as bullet points:\n\n${contextText}`,
      },
      {
        index: 2,
        prompt: `Based on this text, suggest practical real-world applications. How can readers apply these ideas in business, personal life, or leadership? Be specific:\n\n${contextText}`,
      },
      {
        index: 3,
        prompt: `Create 4-5 actionable steps a reader could take based on this text. Number them:\n\n${contextText}`,
      },
    ]

    // Generate all insights in parallel
    await Promise.all(
      prompts.map(async ({ index, prompt }) => {
        try {
          const { text } = await generateText({
            model: "openai/gpt-4o-mini",
            prompt,
            maxTokens: 500,
          })

          setInsights((prev) => {
            const updated = [...prev]
            updated[index] = { ...updated[index], content: text, isLoading: false }
            return updated
          })
        } catch (error) {
          console.error(`Failed to generate insight ${index}:`, error)
          setInsights((prev) => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              content: "Unable to generate insights. Please try again.",
              isLoading: false,
            }
            return updated
          })
        }
      }),
    )
  }, [book, currentPage])

  useEffect(() => {
    generateInsights()
  }, [generateInsights])

  const askAI = async () => {
    if (!question.trim() || !book || isAskingAI) return

    setIsAskingAI(true)
    setAnswer("")

    const contextText = book.pages
      .map((p) => p.text)
      .join("\n\n")
      .slice(0, 10000)

    try {
      const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: `Based on the following book content, answer this question: "${question}"\n\nBook content:\n${contextText}`,
        maxTokens: 500,
      })

      setAnswer(text)
    } catch (error) {
      console.error("Failed to get AI answer:", error)
      setAnswer("Sorry, I couldn't process your question. Please try again.")
    } finally {
      setIsAskingAI(false)
    }
  }

  // Calculate stats
  const totalWords = book?.pages.reduce((acc, page) => acc + page.text.split(" ").length, 0) || 0
  const readWords = book?.pages.slice(0, currentPage).reduce((acc, page) => acc + page.text.split(" ").length, 0) || 0
  const progressPercent = book ? Math.round((currentPage / book.totalPages) * 100) : 0
  const totalNotes = Object.values(notes).filter((n) => n && n.trim().length > 0).length

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
          <p className="text-muted-foreground mt-1 truncate max-w-[300px] md:max-w-none">
            Neural analysis of &ldquo;{book?.title}&rdquo;
          </p>
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
                  {insight.isLoading ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-colors",
                        activeInsight === index ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
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
            {insights[activeInsight].isLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing content...</span>
              </div>
            ) : (
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {insights[activeInsight].content}
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Reading Progress",
                value: `${progressPercent}%`,
                sub: `${currentPage} of ${book?.totalPages || 0} pages`,
              },
              {
                label: "Words Read",
                value: readWords.toLocaleString(),
                sub: `of ${totalWords.toLocaleString()} total`,
              },
              { label: "Insights Generated", value: "4", sub: "From current context" },
              { label: "Notes Created", value: totalNotes.toString(), sub: "Across all pages" },
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
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAI()}
              placeholder={`What would you like to know about "${book?.title}"?`}
              className="w-full px-6 py-4 pr-24 rounded-2xl bg-card/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={askAI}
              disabled={isAskingAI || !question.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50"
            >
              {isAskingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {/* AI Answer */}
          {answer && (
            <div className="mt-6 p-6 rounded-xl bg-card/30 border border-primary/30">
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
