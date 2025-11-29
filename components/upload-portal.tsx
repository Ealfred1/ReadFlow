"use client"

import type React from "react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Upload, FileText, Sparkles, Check, AlertCircle, Clock, Trash2, BookOpen } from "lucide-react"
import { parsePDF, splitIntoSentences } from "@/lib/pdf-parser"
import { useBookStore, type BookData, type BookPage, type UploadedFile } from "@/lib/book-store"

interface UploadPortalProps {
  onUploadComplete: () => void
}

export function UploadPortal({ onUploadComplete }: UploadPortalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingBook, setIsLoadingBook] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setBook, uploadedFiles, addUploadedFile, removeUploadedFile, loadBookFromStorage } = useBookStore()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file")
      return
    }

    setError(null)
    setFileName(file.name.replace(".pdf", ""))
    setIsProcessing(true)
    setUploadProgress(10)

    try {
      setUploadProgress(30)
      const parsedPages = await parsePDF(file)
      setUploadProgress(70)

      if (parsedPages.length === 0) {
        throw new Error("Could not extract text from PDF. The file may be scanned or protected.")
      }

      const bookPages: BookPage[] = parsedPages.map((page) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        sentences: splitIntoSentences(page.text),
      }))

      const title = file.name.replace(".pdf", "").replace(/_/g, " ")

      const bookData: BookData = {
        title,
        fileName: file.name,
        pages: bookPages,
        totalPages: bookPages.length,
      }

      setUploadProgress(100)
      setBook(bookData)

      const uploadedFile: UploadedFile = {
        id: `${file.name}-${Date.now()}`,
        title,
        fileName: file.name,
        totalPages: bookPages.length,
        lastReadPage: 1,
        lastReadSentenceIndex: 0,
        lastReadAt: new Date(),
        progress: 0,
      }
      addUploadedFile(uploadedFile)

      setTimeout(() => {
        onUploadComplete()
      }, 500)
    } catch (err) {
      console.error("PDF processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to process PDF")
      setIsProcessing(false)
      setUploadProgress(0)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Portal header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Upload Portal</span>
          </h2>
          <p className="text-muted-foreground text-lg">Drop your PDF into the dimensional gateway</p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/20 border border-destructive/50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={cn(
              "relative cursor-pointer rounded-3xl transition-all duration-500",
              "border-2 border-dashed",
              "aspect-square max-h-[350px] w-full",
              "flex flex-col items-center justify-center",
              "backdrop-blur-xl",
              isProcessing && "pointer-events-none",
              isDragging
                ? "border-primary bg-primary/10 scale-105 shadow-[0_0_80px_rgba(168,85,247,0.4)]"
                : "border-border/50 bg-card/20 hover:border-primary/50 hover:bg-card/30",
            )}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <svg className="absolute inset-0 w-28 h-28 -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="52"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={327}
                      strokeDashoffset={327 - (327 * uploadProgress) / 100}
                      className="transition-all duration-300"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                        <stop offset="100%" stopColor="rgb(139, 92, 246)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {uploadProgress >= 100 ? (
                      <Check className="w-10 h-10 text-primary animate-in zoom-in duration-300" />
                    ) : (
                      <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium mb-2 truncate max-w-[200px]">{fileName}</p>
                  <p className="text-muted-foreground text-sm">
                    {uploadProgress < 30
                      ? "Reading PDF..."
                      : uploadProgress < 70
                        ? "Extracting text..."
                        : uploadProgress < 100
                          ? "Preparing content..."
                          : "Entering dimension..."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
                  <div
                    className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  />
                  <div className="absolute inset-8 rounded-full bg-card/50 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                </div>

                <p className="text-foreground font-medium text-lg mb-2">Drop PDF to transmute</p>
                <p className="text-muted-foreground text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  or click to select
                </p>
              </>
            )}

            {/* Corner decorations */}
            <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/50 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/50 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary/50 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary/50 rounded-br-lg" />
          </div>

          <div className="rounded-3xl bg-card/20 backdrop-blur-xl border border-border/30 p-6 flex flex-col max-h-[350px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Library</h3>
                <p className="text-xs text-muted-foreground">{uploadedFiles.length} books</p>
              </div>
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-card/30 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm">No books yet</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Upload a PDF to start reading</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "group p-3 rounded-xl bg-card/30 hover:bg-card/50 border border-border/20 hover:border-primary/30 transition-all",
                      isLoadingBook === file.id ? "opacity-50 cursor-wait" : "cursor-pointer",
                    )}
                    onClick={async () => {
                      if (isLoadingBook) return
                      setIsLoadingBook(file.id)
                      setError(null)
                      try {
                        const loaded = await loadBookFromStorage(file.id)
                        if (loaded) {
                          onUploadComplete()
                        } else {
                          setError("Book data not found. Please upload the file again.")
                        }
                      } catch (err) {
                        setError("Failed to load book. Please try again.")
                        console.error("Error loading book:", err)
                      } finally {
                        setIsLoadingBook(null)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{file.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Page {file.lastReadPage}/{file.totalPages}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(file.lastReadAt)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-card/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeUploadedFile(file.id)
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
