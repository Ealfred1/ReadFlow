import { useBookStore } from "./book-store"
import { cleanTextForTTS } from "./pdf-parser"

class SpeechEngine {
  private audio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private animationFrame: number | null = null
  private currentSentences: string[] = []
  private currentSentenceIndex = 0
  private onSentenceChange: ((index: number) => void) | null = null
  private onEnd: (() => void) | null = null
  private isPaused = false
  private currentRate = 1
  private currentVolume = 0.75
  private useElevenLabs = true
  private elevenLabsFailed = false
  
  // Batching for ElevenLabs - send multiple sentences at once
  private readonly BATCH_SIZE = 8 // Number of sentences to batch together
  private currentBatchStartIndex = 0
  private currentBatchEndIndex = 0
  private sentenceDurations: number[] = [] // Estimated duration per sentence in current batch
  private sentenceCharacterPositions: number[] = [] // Character positions for each sentence in batched text
  private totalAudioDuration = 0 // Actual audio duration from ElevenLabs

  setSentenceChangeCallback(callback: (index: number) => void) {
    this.onSentenceChange = callback
  }

  setEndCallback(callback: () => void) {
    this.onEnd = callback
  }

  private async generateSpeech(text: string): Promise<string | null> {
    if (this.elevenLabsFailed) {
      return null
    }

    // Clean text for better TTS quality
    const cleanedText = cleanTextForTTS(text)
    
    // Don't skip - even short text should be spoken
    // Only skip if completely empty
    if (!cleanedText || cleanedText.trim().length === 0) {
      return null
    }

    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanedText }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.fallback) {
          this.elevenLabsFailed = true
          this.useElevenLabs = false
        }
        return null
      }

      const data = await response.json()
      if (data.audio) {
        const audioBlob = this.base64ToBlob(data.audio, "audio/mpeg")
        return URL.createObjectURL(audioBlob)
      }
      return null
    } catch (error) {
      console.error("[v0] Speech generation error:", error)
      this.elevenLabsFailed = true
      this.useElevenLabs = false
      return null
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  private setupAudioAnalyser() {
    if (!this.audio || typeof window === "undefined") return

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume()
      }

      if (!this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audio)
        this.analyser = this.audioContext.createAnalyser()
        this.analyser.fftSize = 128
        this.sourceNode.connect(this.analyser)
        this.analyser.connect(this.audioContext.destination)
      }
    } catch {
      // Already connected or error, continue with fallback visualization
    }
  }

  private startVisualization() {
    const updateVisualization = () => {
      const store = useBookStore.getState()

      if (this.analyser && store.isPlaying) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
        this.analyser.getByteFrequencyData(dataArray)

        const normalized = Array.from(dataArray)
          .slice(0, 50)
          .map((v) => Math.max(v / 255, 0.1))

        store.setAudioData(normalized)
      } else if (store.isPlaying) {
        const data = Array(50)
          .fill(0)
          .map((_, i) => {
            const base = Math.sin(Date.now() / 200 + i * 0.3) * 0.3 + 0.4
            return Math.max(base + Math.random() * 0.2, 0.15)
          })
        store.setAudioData(data)
      }

      this.animationFrame = requestAnimationFrame(updateVisualization)
    }

    updateVisualization()
  }

  private stopVisualization() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    useBookStore.getState().setAudioData(Array(50).fill(0.1))
  }

  // Track position in batched audio for highlighting - improved accuracy
  private updateSentenceFromAudioPosition() {
    if (!this.audio || this.sentenceDurations.length === 0 || this.isPaused) return
    if (this.totalAudioDuration === 0) return // Wait for duration to be set

    // Use currentTime directly (starts at 0 when audio loads)
    const elapsedTime = this.audio.currentTime
    
    if (elapsedTime < 0) return

    // Calculate progress percentage through the audio
    const progress = Math.min(elapsedTime / this.totalAudioDuration, 1.0)

    // Use character positions for more accurate tracking
    // Calculate which character position we're at based on progress
    let sentenceIndex = this.currentBatchStartIndex

    if (this.sentenceCharacterPositions.length > 0) {
      // Find sentence based on character position in the batched text
      const totalChars = this.sentenceCharacterPositions[this.sentenceCharacterPositions.length - 1]
      const currentCharPosition = Math.floor(progress * totalChars)

      for (let i = 0; i < this.sentenceCharacterPositions.length - 1; i++) {
        if (currentCharPosition >= this.sentenceCharacterPositions[i] && 
            currentCharPosition < this.sentenceCharacterPositions[i + 1]) {
          sentenceIndex = this.currentBatchStartIndex + i
          break
        }
      }
      
      // If we're past the last sentence, use the last one
      if (currentCharPosition >= this.sentenceCharacterPositions[this.sentenceCharacterPositions.length - 1]) {
        sentenceIndex = this.currentBatchEndIndex - 1
      }
    } else {
      // Fallback to time-based tracking
      let accumulatedTime = 0
      for (let i = 0; i < this.sentenceDurations.length; i++) {
        const sentenceDuration = this.sentenceDurations[i]
        if (elapsedTime < accumulatedTime + sentenceDuration) {
          sentenceIndex = this.currentBatchStartIndex + i
          break
        }
        accumulatedTime += sentenceDuration
        sentenceIndex = this.currentBatchStartIndex + i + 1
      }
    }

    // Clamp to valid range
    sentenceIndex = Math.min(sentenceIndex, this.currentBatchEndIndex - 1)
    sentenceIndex = Math.max(sentenceIndex, this.currentBatchStartIndex)

    if (sentenceIndex !== this.currentSentenceIndex) {
      this.currentSentenceIndex = sentenceIndex
      if (this.onSentenceChange) {
        this.onSentenceChange(sentenceIndex)
      }
    }
  }

  async speak(sentences: string[], startIndex = 0, rate = 1, volume = 0.75) {
    // CRITICAL: Always stop any existing playback first
    this.stop()
    
    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 50))
    
    this.currentSentences = sentences
    this.currentSentenceIndex = startIndex
    this.currentRate = rate
    this.currentVolume = volume
    this.isPaused = false

    this.sourceNode = null

    // ONLY use ElevenLabs - no system voice fallback
    if (this.elevenLabsFailed) {
      console.error("ElevenLabs has failed. Cannot generate speech.")
      if (this.onEnd) this.onEnd()
      return
    }

    this.startVisualization()
    this.processNextBatch()
  }

  private async processNextBatch() {
    if (this.isPaused || this.currentSentenceIndex >= this.currentSentences.length) {
      if (this.currentSentenceIndex >= this.currentSentences.length) {
        this.stopVisualization()
        if (this.onEnd) this.onEnd()
      }
      return
    }

    // Batch multiple sentences together to save ElevenLabs credits
    const batchStart = this.currentSentenceIndex
    const batchEnd = Math.min(batchStart + this.BATCH_SIZE, this.currentSentences.length)
    const batchSentences = this.currentSentences.slice(batchStart, batchEnd)
    const batchedText = batchSentences.join(" ")

    // Calculate character positions for each sentence in the batched text
    // This allows for more accurate position tracking
    this.sentenceCharacterPositions = [0]
    let charCount = 0
    for (let i = 0; i < batchSentences.length; i++) {
      charCount += batchSentences[i].length + 1 // +1 for the space
      this.sentenceCharacterPositions.push(charCount)
    }

    // Estimate duration per sentence (rough estimate: 150 words per minute)
    // Will be refined when actual audio duration is known
    const wordsPerMinute = 150 * this.currentRate
    this.sentenceDurations = batchSentences.map(sentence => {
      const wordCount = sentence.split(/\s+/).length
      return (wordCount / wordsPerMinute) * 60 // Duration in seconds
    })

    this.currentBatchStartIndex = batchStart
    this.currentBatchEndIndex = batchEnd
    this.totalAudioDuration = 0 // Will be set when audio loads

    // Update to first sentence in batch
    if (this.onSentenceChange) {
      this.onSentenceChange(batchStart)
    }
    this.currentSentenceIndex = batchStart

    const audioUrl = await this.generateSpeech(batchedText)

    if (!audioUrl) {
      // ElevenLabs failed - stop playback, don't use system voice
      console.error("ElevenLabs failed to generate audio. Stopping playback.")
      this.elevenLabsFailed = true
      this.stop()
      if (this.onEnd) this.onEnd()
      return
    }

    // CRITICAL: Stop and clean up any existing audio before creating new one
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ""
      this.audio.onended = null
      this.audio.onerror = null
      this.audio.ontimeupdate = null
      this.audio = null
    }
    
    // Disconnect old source node if it exists
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch (e) {
        // Ignore errors
      }
      this.sourceNode = null
    }

    // Create new audio element
    this.audio = new Audio(audioUrl)
    this.audio.volume = this.currentVolume
    this.audio.playbackRate = this.currentRate

    this.setupAudioAnalyser()

    // Get actual audio duration when metadata loads
    this.audio.onloadedmetadata = () => {
      if (this.audio) {
        this.totalAudioDuration = this.audio.duration
        // Recalculate sentence durations based on actual audio duration
        // Distribute the actual duration proportionally based on character count
        const totalChars = this.sentenceCharacterPositions[this.sentenceCharacterPositions.length - 1]
        if (totalChars > 0) {
          this.sentenceDurations = []
          for (let i = 0; i < this.sentenceCharacterPositions.length - 1; i++) {
            const sentenceChars = this.sentenceCharacterPositions[i + 1] - this.sentenceCharacterPositions[i]
            const sentenceDuration = (sentenceChars / totalChars) * this.totalAudioDuration
            this.sentenceDurations.push(sentenceDuration)
          }
        }
      }
    }

    // Track position in audio for sentence highlighting
    // timeupdate fires ~4 times per second, which is sufficient for smooth highlighting
    this.audio.ontimeupdate = () => {
      if (!this.isPaused && this.totalAudioDuration > 0) {
        this.updateSentenceFromAudioPosition()
      }
    }

    this.audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      if (this.audio) {
        this.audio.src = ""
        this.audio.ontimeupdate = null
        this.audio.onended = null
        this.audio.onerror = null
        this.audio = null
      }
      
      // Move to next batch
      this.currentSentenceIndex = batchEnd
      if (this.onSentenceChange) {
        this.onSentenceChange(batchEnd - 1) // Highlight last sentence of batch
      }
      
      // Process next batch
      this.processNextBatch()
    }

    this.audio.onerror = () => {
      URL.revokeObjectURL(audioUrl)
      if (this.audio) {
        this.audio.src = ""
        this.audio.ontimeupdate = null
        this.audio.onended = null
        this.audio.onerror = null
        this.audio = null
      }
      // ElevenLabs failed - stop, don't use system voice
      console.error("ElevenLabs audio playback failed. Stopping.")
      this.elevenLabsFailed = true
      this.stop()
      if (this.onEnd) this.onEnd()
    }

    try {
      await this.audio.play()
      // Audio currentTime starts at 0, no need to track start time
    } catch (error) {
      console.error("Failed to play audio:", error)
      this.elevenLabsFailed = true
      this.stop()
      if (this.onEnd) this.onEnd()
    }
  }

  pause() {
    this.isPaused = true

    if (this.audio) {
      this.audio.pause()
    }

    // NO system voice - only ElevenLabs
    this.stopVisualization()
  }

  resume(rate: number, volume: number) {
    this.isPaused = false
    this.currentRate = rate
    this.currentVolume = volume

    if (this.audio && this.audio.paused) {
      this.audio.volume = volume
      this.audio.playbackRate = rate
      this.audio.play()
      this.startVisualization()
    } else if (this.currentSentenceIndex < this.currentSentences.length) {
      // Resume from current position
      this.startVisualization()
      this.processNextBatch()
    }
  }

  stop() {
    this.isPaused = true

    // Stop and clean up audio element
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ""
      this.audio.onended = null
      this.audio.onerror = null
      this.audio.ontimeupdate = null
      this.audio = null
    }

    // Disconnect audio source node
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch (e) {
        // Ignore errors
      }
      this.sourceNode = null
    }

    // NO system voice - only ElevenLabs
    this.stopVisualization()
  }

  setVolume(volume: number) {
    this.currentVolume = volume
    if (this.audio) {
      this.audio.volume = volume
    }
  }

  setRate(rate: number) {
    this.currentRate = rate
    if (this.audio) {
      this.audio.playbackRate = rate
    }
  }

  getCurrentSentenceIndex() {
    return this.currentSentenceIndex
  }
}

let speechEngine: SpeechEngine | null = null

export function getSpeechEngine(): SpeechEngine {
  if (!speechEngine) {
    speechEngine = new SpeechEngine()
  }
  return speechEngine
}

