"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Settings,
  X,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { useBookStore } from "@/lib/book-store"
import { getSpeechEngine } from "@/lib/speech-engine"

interface ReaderDimensionProps {
  onInsights: () => void
}

export function ReaderDimension({ onInsights }: ReaderDimensionProps) {
  const {
    book,
    currentPage,
    setCurrentPage,
    currentSentenceIndex,
    setCurrentSentenceIndex,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    volume,
    setVolume,
    notes,
    setNote,
    audioData,
  } = useBookStore()

  const [showSettings, setShowSettings] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState({ current: "0:00", total: "0:00" })
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  const currentPageData = book?.pages[currentPage - 1]
  const sentences = currentPageData?.sentences || []

  useEffect(() => {
    if (!book) return

    const wordsPerMinute = 150 * playbackSpeed
    const totalWords = book.pages.reduce((acc, page) => acc + page.text.split(" ").length, 0)
    const totalMinutes = totalWords / wordsPerMinute

    const currentWords = book.pages
      .slice(0, currentPage - 1)
      .reduce((acc, page) => acc + page.text.split(" ").length, 0)
    const currentWordsOnPage = sentences.slice(0, currentSentenceIndex).join(" ").split(" ").length
    const totalCurrentWords = currentWords + currentWordsOnPage
    const currentMinutes = totalCurrentWords / wordsPerMinute

    const formatTime = (minutes: number) => {
      const hrs = Math.floor(minutes / 60)
      const mins = Math.floor(minutes % 60)
      const secs = Math.floor((minutes * 60) % 60)
      if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    setEstimatedTime({
      current: formatTime(currentMinutes),
      total: formatTime(totalMinutes),
    })
  }, [book, currentPage, currentSentenceIndex, playbackSpeed, sentences])

  useEffect(() => {
    const engine = getSpeechEngine()

    engine.setSentenceChangeCallback((index) => {
      setCurrentSentenceIndex(index)
    })

    engine.setEndCallback(() => {
      if (book && currentPage < book.totalPages) {
        setCurrentPage(currentPage + 1)
        const nextPageSentences = book.pages[currentPage]?.sentences || []
        if (nextPageSentences.length > 0) {
          setTimeout(() => {
            engine.speak(nextPageSentences, 0, playbackSpeed, volume)
          }, 500)
        }
      } else {
        setIsPlaying(false)
      }
    })

    return () => {
      engine.stop()
    }
  }, [book, currentPage, playbackSpeed, volume, setCurrentSentenceIndex, setCurrentPage, setIsPlaying])

  const togglePlayback = useCallback(() => {
    const engine = getSpeechEngine()

    if (isPlaying) {
      engine.pause()
      setIsPlaying(false)
    } else {
      if (sentences.length > 0) {
        engine.speak(sentences, currentSentenceIndex, playbackSpeed, volume)
        setIsPlaying(true)
      }
    }
  }, [isPlaying, sentences, currentSentenceIndex, playbackSpeed, volume, setIsPlaying])

  const goToPage = useCallback(
    (page: number) => {
      if (!book) return
      const newPage = Math.max(1, Math.min(page, book.totalPages))
      const engine = getSpeechEngine()
      engine.stop()
      setCurrentPage(newPage)
      setCurrentSentenceIndex(0)
      setIsPlaying(false)
    },
    [book, setCurrentPage, setCurrentSentenceIndex, setIsPlaying],
  )

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    const newSpeed = speeds[nextIndex]
    setPlaybackSpeed(newSpeed)

    const engine = getSpeechEngine()
    engine.setRate(newSpeed)
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0] / 100
    setVolume(vol)
    const engine = getSpeechEngine()
    engine.setVolume(vol)
  }

  if (!book || !currentPageData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No book loaded</p>
      </div>
    )
  }

  const progressPercent =
    ((currentPage - 1) / book.totalPages) * 100 +
    (currentSentenceIndex / Math.max(sentences.length, 1)) * (100 / book.totalPages)

  return (
    <div className="relative z-10 h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 backdrop-blur-xl bg-background/40 border-b border-border/20 z-50">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-foreground truncate max-w-[150px] sm:max-w-[250px] md:max-w-[400px]">
              {book.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {book.totalPages}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={onInsights}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs md:text-sm hidden sm:inline">AI Insights</span>
          </button>
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="p-2 rounded-full hover:bg-card/50 transition-colors lg:hidden"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-card/50 transition-colors"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-14 md:top-16 right-4 md:right-6 z-50 w-64 md:w-72 p-4 rounded-xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">Settings</span>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Playback Speed</label>
              <div className="flex gap-2 flex-wrap">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackSpeed(speed)
                      getSpeechEngine().setRate(speed)
                    }}
                    className={cn(
                      "px-2 py-1 text-xs rounded-lg transition-colors",
                      playbackSpeed === speed
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/50 text-muted-foreground hover:bg-card",
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left panel - Live transcript with fixed height scroll */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              {/* Waveform visualizer */}
              <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-2xl bg-card/20 backdrop-blur-xl border border-border/20">
                <div className="flex items-end justify-center gap-[2px] h-12 md:h-16">
                  {audioData.map((height, i) => (
                    <div
                      key={i}
                      className="w-[2px] md:w-[3px] rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(height * 100, 8)}%`,
                        opacity: isPlaying ? 0.9 : 0.3,
                        background: `linear-gradient(to top, rgba(139,92,246,0.6), rgba(168,85,247,${isPlaying ? 1 : 0.4}))`,
                        boxShadow: isPlaying ? `0 0 ${height * 10}px rgba(139,92,246,0.5)` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Text content with highlighted current sentence */}
              <div className="text-base md:text-lg leading-relaxed text-foreground/90">
                {sentences.map((sentence, i) => (
                  <span
                    key={i}
                    onClick={() => {
                      setCurrentSentenceIndex(i)
                      if (isPlaying) {
                        const engine = getSpeechEngine()
                        engine.stop()
                        engine.speak(sentences, i, playbackSpeed, volume)
                      }
                    }}
                    className={cn(
                      "cursor-pointer transition-all duration-300 inline",
                      i === currentSentenceIndex
                        ? "text-foreground bg-primary/30 rounded px-1 py-0.5 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                        : i < currentSentenceIndex
                          ? "text-muted-foreground"
                          : "text-foreground/70 hover:text-foreground",
                    )}
                  >
                    {sentence}{" "}
                  </span>
                ))}
              </div>

              {/* Notes section */}
              <div className="mt-6 md:mt-8 p-3 md:p-4 rounded-2xl bg-card/15 border border-border/20">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 md:mb-3">Your Notes</h3>
                <textarea
                  value={notes[currentPage] || ""}
                  onChange={(e) => setNote(currentPage, e.target.value)}
                  placeholder="Capture your thoughts..."
                  className="w-full h-16 md:h-20 bg-transparent resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "w-full sm:w-80 lg:w-[320px] border-l border-border/20 bg-card/10 backdrop-blur-xl p-4 flex flex-col overflow-hidden",
            "fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 lg:relative lg:transform-none",
            showMobileSidebar ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          {/* Mobile close button */}
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-card/50 lg:hidden"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {book.totalPages}
            </span>
            <button className="p-1.5 rounded-lg hover:bg-card/50 transition-colors hidden lg:block">
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 rounded-xl bg-foreground/5 border border-border/20 p-4 overflow-y-auto min-h-0">
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{currentPageData.text}</p>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-center gap-3 mt-3 flex-shrink-0">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-card/50 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground">
              {Math.round((currentPage / book.totalPages) * 100)}% complete
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= book.totalPages}
              className="p-1.5 rounded-lg hover:bg-card/50 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {showMobileSidebar && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setShowMobileSidebar(false)} />
        )}
      </div>

      <footer className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 backdrop-blur-xl bg-background/40 border-t border-border/20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3 md:mb-4">
            <div className="relative h-2 bg-card/50 rounded-full overflow-hidden cursor-pointer group">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
              <Slider
                value={[progressPercent]}
                max={100}
                step={0.1}
                className="absolute inset-0 opacity-0 cursor-pointer"
                onValueChange={([value]) => {
                  const targetPage = Math.floor((value / 100) * book.totalPages) + 1
                  goToPage(targetPage)
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 md:mt-2">
              <span className="text-xs text-muted-foreground">{estimatedTime.current}</span>
              <span className="text-xs text-muted-foreground">{estimatedTime.total}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-6">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 rounded-full hover:bg-card/50 transition-colors disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
            </button>

            <button
              onClick={togglePlayback}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-full transition-all duration-300 flex items-center justify-center",
                "bg-gradient-to-r from-primary to-accent",
                "hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
                "hover:scale-105",
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground ml-0.5" />
              )}
            </button>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= book.totalPages}
              className="p-2 rounded-full hover:bg-card/50 transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
            </button>

            <div className="flex items-center gap-2 md:gap-4 ml-2 md:ml-4">
              {/* Speed control */}
              <button
                onClick={cycleSpeed}
                className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-card/30 border border-border/30 text-xs md:text-sm text-foreground hover:border-primary/50 transition-colors"
              >
                {playbackSpeed}x
              </button>

              {/* Volume - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => {
                    const newVol = volume > 0 ? 0 : 0.75
                    setVolume(newVol)
                    getSpeechEngine().setVolume(newVol)
                  }}
                >
                  {volume > 0 ? (
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                  )}
                </button>
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  className="w-16 md:w-20"
                  onValueChange={handleVolumeChange}
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
