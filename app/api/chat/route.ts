import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  fetchCompactSummary,
  fetchEnrollmentByDeptProgramYear,
  summaryToText,
  enrollmentByDeptProgramYearToText,
} from '@/lib/chat/data-fetcher'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

type Db = SupabaseClient<Database> | null

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY
const MAX_MESSAGE_LENGTH = 2000

export type ChartData = {
  type: 'bar' | 'line'
  title: string
  labels: string[]
  datasets: { label: string; data: number[] }[]
}

export type ChatApiResponse = {
  reply: string
  chart?: ChartData
  source: 'ai-generated'
}

// ─── AI Response Builder ─────────────────────────────────────────────────────

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return codeBlock[1].trim()
  const jsonObject = text.match(/\{[\s\S]*\}/)
  if (jsonObject) return jsonObject[0]
  return text
}

async function buildAIResponse(message: string, db: Db): Promise<ChatApiResponse> {
  if (!GEMINI_API_KEY) {
    return {
      reply: 'AI is not configured. Please set GOOGLE_GEMINI_API_KEY in your environment.',
      source: 'ai-generated',
    }
  }

  const [summary, contextualData] = await Promise.all([
    fetchCompactSummary(db),
    fetchEnrollmentByDeptProgramYear(db),
  ])
  const summaryText = summaryToText(summary)
  const contextualText = enrollmentByDeptProgramYearToText(contextualData)

const prompt = `
You are an AI assistant for Enrollytics, a Freshman Enrollment Analytics System.

You ONLY answer questions about:
- student enrollment
- academic programs
- departments
- enrollment analytics
- year-by-year trends
- student demographics (gender, age distribution, and locations)
- location-based enrollment patterns (address x program x department insights)

If the question is unrelated, respond with:
{"reply":"Sorry, I can only answer questions related to enrollment data."}

Context Data (Summary with Demographics including Gender & Location Insights):
${summaryText}

Detailed Enrollment Data (by Department, Program, Year & Gender):
${contextualText}

User Question:
"${message}"

STRICT INSTRUCTIONS:
- Return ONLY a valid JSON object
- DO NOT include markdown, code blocks, or explanations
- DO NOT include text outside JSON
- Use the detailed enrollment data to provide year-by-year insights when relevant
- Use the Insight View data to answer location-based enrollment questions
- Reference specific departments, programs, years, and locations when answering

JSON FORMAT:
{
  "reply": "concise insight with specific data points",
  "chart": {
    "type": "bar | line",
    "title": "Chart Title",
    "labels": ["Label1", "Label2"],
    "datasets": [{"label": "Data", "data": [10, 20]}]
  }
}

RULES:
- "chart" is OPTIONAL (omit if not needed)
- Use "bar" for comparisons between departments/programs
- Use "line" for trends over time (year-by-year)
- Chart must have "datasets" array with at least one object containing "label" and "data"
- Keep reply short but include specific numbers from the data
- Reference department codes (e.g., CS, ENG) and program codes when relevant
- If data is insufficient, only return "reply" without chart
`;

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: { temperature: 0.3, maxOutputTokens: 1024 },
  })
  const text = response.text ?? ''

  try {
    const parsed = JSON.parse(extractJSON(text))
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : text,
      chart: parsed.chart,
      source: 'ai-generated',
    }
  } catch {
    return { reply: text, source: 'ai-generated' }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { message } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH)

  try {
    const db: Db = isSupabaseConfigured ? await createClient() : null
    const response = await buildAIResponse(trimmedMessage, db)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    )
  }
}

