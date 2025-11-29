import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface BookPage {
  pageNumber: number
  text: string
  sentences: string[]
}

export interface BookData {
  title: string
  fileName: string
  pages: BookPage[]
  totalPages: number
}

export interface UploadedFile {
  id: string
  title: string
  fileName: string
  totalPages: number
  lastReadPage: number
  lastReadSentenceIndex: number
  lastReadAt: Date
  progress: number
}

interface BookStore {
  // Book data
  book: BookData | null
  setBook: (book: BookData | null) => void
  loadBookFromStorage: (fileId: string) => Promise<boolean>

      uploadedFiles: UploadedFile[]
      addUploadedFile: (file: UploadedFile) => void
      updateFileProgress: (id: string, page: number, sentenceIndex?: number) => void
      removeUploadedFile: (id: string) => void

  // Reading state
  currentPage: number
  setCurrentPage: (page: number) => void
  currentSentenceIndex: number
  setCurrentSentenceIndex: (index: number) => void

  // Audio state
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  volume: number
  setVolume: (volume: number) => void

  // Progress
  currentTime: number
  setCurrentTime: (time: number) => void
  totalTime: number
  setTotalTime: (time: number) => void

  // Notes
  notes: Record<number, string>
  setNote: (page: number, note: string) => void

  // Audio analyzer data for waveform
  audioData: number[]
  setAudioData: (data: number[]) => void
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      book: null,
      setBook: (book) => {
        set({ book, currentPage: 1, currentSentenceIndex: 0 })
        // Update file progress when loading a book
        if (book) {
          const existing = get().uploadedFiles.find((f) => f.fileName === book.fileName)
          if (existing) {
            set({ 
              currentPage: existing.lastReadPage || 1,
              currentSentenceIndex: existing.lastReadSentenceIndex || 0
            })
          }
          // Store full book data in localStorage for later retrieval
          try {
            const storageKey = `readflow-book-${book.fileName}`
            localStorage.setItem(storageKey, JSON.stringify(book))
          } catch (error) {
            console.warn("Failed to store book data:", error)
          }
        }
      },
      loadBookFromStorage: async (fileId) => {
        const file = get().uploadedFiles.find((f) => f.id === fileId)
        if (!file) return false

        try {
          const storageKey = `readflow-book-${file.fileName}`
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const bookData: BookData = JSON.parse(stored)
            get().setBook(bookData)
            return true
          }
        } catch (error) {
          console.error("Failed to load book from storage:", error)
        }
        return false
      },

      uploadedFiles: [],
      addUploadedFile: (file) =>
        set((state) => {
          const existing = state.uploadedFiles.find((f) => f.fileName === file.fileName)
          if (existing) {
            return {
              uploadedFiles: state.uploadedFiles.map((f) =>
                f.fileName === file.fileName ? { ...f, lastReadAt: new Date() } : f,
              ),
            }
          }
          return { uploadedFiles: [file, ...state.uploadedFiles].slice(0, 20) }
        }),
      updateFileProgress: (id, page, sentenceIndex = 0) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map((f) =>
            f.id === id
              ? { 
                  ...f, 
                  lastReadPage: page, 
                  lastReadSentenceIndex: sentenceIndex,
                  progress: Math.round((page / f.totalPages) * 100), 
                  lastReadAt: new Date() 
                }
              : f,
          ),
        })),
      removeUploadedFile: (id) => {
        const file = get().uploadedFiles.find((f) => f.id === id)
        if (file) {
          // Remove stored book data
          try {
            const storageKey = `readflow-book-${file.fileName}`
            localStorage.removeItem(storageKey)
          } catch (error) {
            console.warn("Failed to remove book data:", error)
          }
        }
        return set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
        }))
      },

      currentPage: 1,
      setCurrentPage: (currentPage) => {
        set({ currentPage, currentSentenceIndex: 0 })
        // Update file progress
        const { book, uploadedFiles, updateFileProgress, currentSentenceIndex } = get()
        if (book) {
          const file = uploadedFiles.find((f) => f.fileName === book.fileName)
          if (file) {
            updateFileProgress(file.id, currentPage, currentSentenceIndex)
          }
        }
      },
      setCurrentSentenceIndex: (currentSentenceIndex) => {
        set({ currentSentenceIndex })
        // Update file progress with sentence index
        const { book, uploadedFiles, updateFileProgress, currentPage } = get()
        if (book) {
          const file = uploadedFiles.find((f) => f.fileName === book.fileName)
          if (file) {
            updateFileProgress(file.id, currentPage, currentSentenceIndex)
          }
        }
      },

      isPlaying: false,
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      playbackSpeed: 1,
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
      volume: 0.75,
      setVolume: (volume) => set({ volume }),

      currentTime: 0,
      setCurrentTime: (currentTime) => set({ currentTime }),
      totalTime: 0,
      setTotalTime: (totalTime) => set({ totalTime }),

      notes: {},
      setNote: (page, note) =>
        set((state) => ({
          notes: { ...state.notes, [page]: note },
        })),

      audioData: Array(50).fill(0.1),
      setAudioData: (audioData) => set({ audioData }),
    }),
    {
      name: "readflow-storage",
      partialize: (state) => ({
        uploadedFiles: state.uploadedFiles,
        notes: state.notes,
        playbackSpeed: state.playbackSpeed,
        volume: state.volume,
        // Don't persist book data here - it's stored separately in localStorage
      }),
    },
  ),
)
