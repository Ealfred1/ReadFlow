"use client"

import { CosmicBackground } from "@/components/cosmic-background"
import { NavigationOrb } from "@/components/navigation-orb"
import { UploadPortal } from "@/components/upload-portal"
import { ReaderDimension } from "@/components/reader-dimension"
import { ConsciousnessStream } from "@/components/consciousness-stream"
import { InsightsView } from "@/components/insights-view"
import { useBookStore } from "@/lib/book-store"
import { useState } from "react"

export type ViewState = "home" | "upload" | "reader" | "insights"

export default function ReadFlowAI() {
  const { book } = useBookStore()
  const [currentView, setCurrentView] = useState<ViewState>("home")

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CosmicBackground />

      <NavigationOrb currentView={currentView} onNavigate={setCurrentView} />

      {currentView === "home" && <ConsciousnessStream onEnter={() => setCurrentView("upload")} />}

      {currentView === "upload" && <UploadPortal onUploadComplete={() => setCurrentView("reader")} />}

      {currentView === "reader" && book && <ReaderDimension onInsights={() => setCurrentView("insights")} />}

      {currentView === "insights" && book && <InsightsView onBack={() => setCurrentView("reader")} />}
    </main>
  )
}
