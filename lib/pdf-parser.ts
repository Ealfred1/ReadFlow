// Dynamic import for pdfjs-dist to avoid SSR issues with DOMMatrix
// Only import when actually needed (client-side only)
let pdfjs: typeof import("pdfjs-dist") | null = null

async function getPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF parsing is only available in the browser")
  }
  
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist")
    // Configure worker with legacy build for better browser compatibility
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  
  return pdfjs
}

export interface ParsedPage {
  pageNumber: number
  text: string
}

const BOILERPLATE_PATTERNS = [
  /copyright\s*©?\s*\d{4}/gi,
  /all rights reserved/gi,
  /ISBN[\s:-]*[\d-]+/gi,
  /published by/gi,
  /no part of this (book|publication)/gi,
  /may (not )?be (used|reproduced|distributed)/gi,
  /without (the )?(written )?permission/gi,
  /graphic,?\s*electronic,?\s*or\s*mechanical/gi,
  /photocopying,?\s*recording/gi,
  /information storage/gi,
  /retrieval system/gi,
  /brief quotations embodied/gi,
  /critical articles and reviews/gi,
  /dynamic nature of the Internet/gi,
  /web addresses or links/gi,
  /may have changed since publication/gi,
  /may no longer be valid/gi,
  /views expressed in this work/gi,
  /solely those of the author/gi,
  /do not necessarily reflect/gi,
  /publisher hereby disclaims/gi,
  /does not dispense medical advice/gi,
  /prescribe the use of any technique/gi,
  /form of treatment/gi,
  /physical,?\s*emotional,?\s*or\s*medical/gi,
  /advice of a physician/gi,
  /intent of the author/gi,
  /information of a general nature/gi,
  /quest for emotional and spiritual/gi,
  /constitutional right/gi,
  /assume no responsibility/gi,
  /OceanofPDF\.com/gi,
  /ePub format/gi,
  /Mobipocket format/gi,
  /in print/gi,
  /This edition:/gi,
  /previously published/gi,
]

function isBoilerplate(text: string): boolean {
  const lowerText = text.toLowerCase()
  let matchCount = 0

  for (const pattern of BOILERPLATE_PATTERNS) {
    if (pattern.test(text)) {
      matchCount++
      pattern.lastIndex = 0 // Reset regex state
    }
  }

  // If multiple patterns match, it's likely boilerplate
  if (matchCount >= 2) return true

  // Also filter very short meaningless sentences
  if (text.length < 20 && /^[\d\s\-:]+$/.test(text)) return true

  return false
}

function cleanBoilerplate(text: string): string {
  // Split into sentences
  const sentences = text
    .replace(/([.?!])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Filter out boilerplate sentences
  const cleanedSentences = sentences.filter((sentence) => !isBoilerplate(sentence))

  return cleanedSentences.join(" ")
}

export async function parsePDF(file: File): Promise<ParsedPage[]> {
  // Ensure we're in the browser
  if (typeof window === "undefined") {
    throw new Error("PDF parsing is only available in the browser")
  }

  // Dynamically import pdfjs-dist (client-side only)
  const pdfjsLib = await getPdfJs()
  
  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise

  const pages: ParsedPage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    let text = textContent.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    text = cleanBoilerplate(text)

    if (text.length > 0) {
      pages.push({
        pageNumber: i,
        text,
      })
    }
  }

  return pages
}

// Common abbreviations that shouldn't end sentences
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e", "a.m", "p.m",
  "am", "pm", "inc", "ltd", "corp", "dept", "govt", "est", "approx", "min", "max",
  "vol", "no", "pp", "ed", "eds", "cf", "ibid", "op", "cit", "et", "al", "ca",
  "st", "ave", "blvd", "rd", "ct", "ln", "pl", "pkwy", "apt", "bldg", "fl",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
])

/**
 * Cleans text for better TTS quality by:
 * - Removing unnecessary breaks and fragments
 * - Handling abbreviations properly
 * - Combining very short sentences
 * - Removing excessive punctuation
 * - Converting patterns like "REGRET 1:" to "Regret one"
 */
export function cleanTextForTTS(text: string): string {
  if (!text || text.trim().length === 0) return ""

  // Remove excessive whitespace and normalize
  let cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim()

  // Convert patterns like "REGRET 1:", "CHAPTER 5:", "PART II:" to natural speech
  // This prevents awkward pauses between the word and number
  cleaned = cleaned.replace(/\b([A-Z][A-Z\s]{2,}?)\s+(\d+)\s*[:.]/gi, (match, word, num) => {
    // Convert to title case
    const wordTitle = word.trim().split(/\s+/).map((w: string) => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(" ")
    // Read number naturally (e.g., "1" becomes "one", "2" becomes "two")
    const numberWords: Record<string, string> = {
      "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
      "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
      "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen"
    }
    const numWord = numberWords[num] || num
    return `${wordTitle} ${numWord}`
  })

  // Convert standalone numbers followed by colons to "number X" (for small numbers)
  cleaned = cleaned.replace(/\b(\d{1,2})\s*[:.]\s+/g, (match, num) => {
    const numberWords: Record<string, string> = {
      "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
      "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"
    }
    const numWord = numberWords[num] || num
    return `number ${numWord} `
  })

  // Convert Roman numerals followed by colons (I:, II:, III:, etc.)
  cleaned = cleaned.replace(/\b([IVX]+)\s*[:.]\s+/gi, (match, roman) => {
    return `${roman} `
  })

  // Handle patterns like "Page 5" or "Page 5 of 10" - remove these as they're metadata
  cleaned = cleaned.replace(/\b(Page|P\.|p\.)\s+\d+(\s+of\s+\d+)?/gi, "")

  // Remove excessive capitalization that causes pauses (convert ALL CAPS words to title case if they're not acronyms)
  cleaned = cleaned.replace(/\b([A-Z]{3,})\b/g, (match) => {
    // If it's a real acronym (all same case, 3+ letters), keep it
    // Otherwise convert to title case
    if (match.length <= 5 && /^[A-Z]+$/.test(match)) {
      // Likely an acronym, keep as is
      return match
    }
    // Convert to title case
    return match.charAt(0) + match.slice(1).toLowerCase()
  })

  // Remove URLs and email addresses (they don't read well)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, "")
  cleaned = cleaned.replace(/[^\s]+@[^\s]+/gi, "")

  // Remove standalone numbers and symbols that cause breaks
  cleaned = cleaned.replace(/\b\d+[.,]\d+\b/g, (match) => {
    // Keep decimal numbers but replace comma with "point" for clarity
    return match.replace(",", " point ")
  })

  // Handle common abbreviations - replace period to prevent sentence breaks
  // Only do this when followed by lowercase (not end of sentence)
  cleaned = cleaned.replace(/\b([a-z]+)\.\s+([a-z])/gi, (match, word, nextChar) => {
    const lower = word.toLowerCase()
    if (ABBREVIATIONS.has(lower)) {
      return word + " " + nextChar // Remove period, keep space
    }
    return match
  })

  // Remove excessive punctuation (multiple periods, exclamation marks, etc.)
  cleaned = cleaned.replace(/\.{3,}/g, "...")
  cleaned = cleaned.replace(/!{2,}/g, "!")
  cleaned = cleaned.replace(/\?{2,}/g, "?")

  // Remove parentheses content ONLY if it's clearly metadata (very short, all caps, or just numbers)
  // Be more conservative - only remove if it's clearly not part of the narrative
  cleaned = cleaned.replace(/\([A-Z0-9\s]{1,10}\)\s*[.:]/g, "") // Only remove if followed by colon/period
  // Don't remove parentheses with lowercase letters or longer content - it might be important

  // Remove square brackets with numbers (often page references)
  cleaned = cleaned.replace(/\[\d+\]/g, "")

  // Clean up spacing around punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1")
  cleaned = cleaned.replace(/([.,!?;:])\s*([.,!?;:])/g, "$1 ")

  // Final cleanup - remove any remaining excessive spaces
  // Don't do any sentence-level manipulation here - preserve all content
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  return cleaned
}

export function splitIntoSentences(text: string): string[] {
  // Split text into sentences FIRST, then clean each sentence individually
  // This preserves all sentences and prevents skipping
  
  // Split by sentence endings
  const rawSentences = text
    .replace(/([.?!])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Clean each sentence individually for TTS, but keep all sentences
  const cleanedSentences = rawSentences
    .map((sentence) => cleanTextForTTS(sentence))
    .filter((s) => s.length > 0) // Only remove completely empty sentences

  return cleanedSentences
}
