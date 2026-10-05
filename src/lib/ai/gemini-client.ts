import { GoogleGenAI } from '@google/genai'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'

export function isAiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return null
  }

  return new GoogleGenAI({ apiKey })
}
