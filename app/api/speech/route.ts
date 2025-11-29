import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json()
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs API key not configured." }, { status: 500 })
    }
    if (!text) {
      return NextResponse.json({ error: "Missing text." }, { status: 400 })
    }
    const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"
    const selectedVoice = voiceId || defaultVoiceId

    // Call ElevenLabs REST API
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      }),
    })

    if (!elevenRes.ok) {
      const err = await elevenRes.text()
      console.error("[v0] ElevenLabs error:", err)
      return NextResponse.json({ error: "Failed to generate audio", details: err, fallback: true }, { status: 500 })
    }

    const audioBuffer = Buffer.from(await elevenRes.arrayBuffer())
    const audioBase64 = audioBuffer.toString("base64")

    return NextResponse.json({ audio: audioBase64 })
  } catch (error) {
    console.error("Error generating audio:", error)
    return NextResponse.json({ error: "Failed to generate audio", fallback: true }, { status: 500 })
  }
}
