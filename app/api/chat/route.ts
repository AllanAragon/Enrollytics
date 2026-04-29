import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { matchIntent, MAX_MESSAGE_LENGTH } from '@/lib/chat/intent-matcher'
import {
  fetchTotalStudents,
  fetchEnrollmentByYear,
  fetchEnrollmentByDept,
  fetchEnrollmentByProgram,
  fetchGrowthData,
  fetchAverageAge,
  fetchCompactSummary,
  summaryToText,
  type YearCount,
  type DeptCount,
  type ProgramCount,
} from '@/lib/chat/data-fetcher'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

type Db = SupabaseClient<Database> | null

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY

export type ChartData = {
  type: 'bar' | 'line'
  title: string
  labels: string[]
  datasets: { label: string; data: number[] }[]
}

export type ChatApiResponse = {
  reply: string
  chart?: ChartData
  source: 'rule-based' | 'ai-generated'
}

// ─── Chart builder helper ────────────────────────────────────────────────────

function barChart(title: string, labels: string[], data: number[], dataLabel: string): ChartData {
  return { type: 'bar', title, labels, datasets: [{ label: dataLabel, data }] }
}

// ─── Rule-based response builders ────────────────────────────────────────────

function buildTotalStudentsResponse(total: number): ChatApiResponse {
  return {
    reply: `There are ${total} students enrolled in total across all academic years.`,
    source: 'rule-based',
  }
}

function buildEnrollmentByYearResponse(data: YearCount[]): ChatApiResponse {
  const active = data.filter((y) => y.count > 0)
  const total = active.reduce((sum, y) => sum + y.count, 0)
  const peak = active.reduce((a, b) => (a.count >= b.count ? a : b), active[0])

  const lines = active.map((y) => `- ${y.year}: ${y.count} students`).join('\n')
  const peakNote = peak ? `\nPeak enrollment year: ${peak.year} with ${peak.count} students.` : ''
  const reply = `Enrollment breakdown by year (${total} total):\n\n${lines}${peakNote}`

  return {
    reply,
    chart: barChart('Enrollment by Year', active.map((y) => String(y.year)), active.map((y) => y.count), 'Students'),
    source: 'rule-based',
  }
}

function buildEnrollmentByDeptResponse(data: DeptCount[], total: number): ChatApiResponse {
  const sorted = [...data].sort((a, b) => b.count - a.count)
  const lines = sorted
    .map((d) => `- ${d.code} (${d.name}): ${d.count} students (${total > 0 ? ((d.count / total) * 100).toFixed(1) : 0}%)`)
    .join('\n')

  return {
    reply: `Enrollment by department:\n\n${lines}`,
    chart: barChart('Students by Department', sorted.map((d) => d.code), sorted.map((d) => d.count), 'Students'),
    source: 'rule-based',
  }
}

function buildEnrollmentByProgramResponse(data: ProgramCount[], total: number): ChatApiResponse {
  const top = data.slice(0, 5)
  const lines = top
    .map((p, i) => `${i + 1}. ${p.code} [${p.deptCode}] — ${p.name}: ${p.count} students (${total > 0 ? ((p.count / total) * 100).toFixed(1) : 0}%)`)
    .join('\n')

  return {
    reply: `Top programs by enrollment:\n\n${lines}`,
    chart: barChart('Students by Program', top.map((p) => p.code), top.map((p) => p.count), 'Students'),
    source: 'rule-based',
  }
}

function buildGrowthRateResponse(
  currentYear: number,
  currentCount: number,
  prevCount: number
): ChatApiResponse {
  const diff = currentCount - prevCount
  const rate = prevCount > 0 ? ((diff / prevCount) * 100).toFixed(1) : null
  const direction = diff >= 0 ? 'increased' : 'decreased'

  let reply = `Year-over-year enrollment comparison:\n\n- ${currentYear - 1}: ${prevCount} students\n- ${currentYear}: ${currentCount} students`
  if (rate !== null) {
    reply += `\n\nEnrollment ${direction} by ${Math.abs(diff)} students (${diff >= 0 ? '+' : ''}${rate}%).`
  } else {
    reply += `\n\nNo prior year data available to calculate growth rate.`
  }

  return {
    reply,
    chart: barChart(
      `Enrollment: ${currentYear - 1} vs ${currentYear}`,
      [String(currentYear - 1), String(currentYear)],
      [prevCount, currentCount],
      'Students'
    ),
    source: 'rule-based',
  }
}

function buildAverageAgeResponse(avgAge: number, total: number): ChatApiResponse {
  return {
    reply: `The average age of enrolled students is ${avgAge.toFixed(1)} years (based on ${total} students).`,
    source: 'rule-based',
  }
}

// ─── AI fallback for unknown intents ─────────────────────────────────────────

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

  const summary = await fetchCompactSummary(db)
  const summaryText = summaryToText(summary)

  const prompt = `You are an AI assistant for Enrollytics, a Freshman Enrollment Analytics System.
Only answer questions related to student enrollment, academic programs, departments, and related analytics.
If the question is unrelated to enrollment data, politely decline.

Current enrollment data:
${summaryText}

User question: "${message}"

Respond ONLY with a valid JSON object (no markdown code blocks, no text outside JSON):
{"reply":"your concise plain-text insight","chart":{"type":"bar","title":"chart title","labels":["L1","L2"],"datasets":[{"label":"Series","data":[1,2]}]}}

Rules:
- "chart" is optional — include it only when comparing multiple data points that benefit from a chart
- Use "type":"bar" for category comparisons, "type":"line" for year/time trends
- Keep "reply" concise and professional`

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()

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
    const intent = matchIntent(trimmedMessage)

    let response: ChatApiResponse

    switch (intent) {
      case 'total_students': {
        const total = await fetchTotalStudents(db)
        response = buildTotalStudentsResponse(total)
        break
      }
      case 'enrollment_by_year': {
        const data = await fetchEnrollmentByYear(db)
        response = buildEnrollmentByYearResponse(data)
        break
      }
      case 'enrollment_by_department': {
        const [data, total] = await Promise.all([fetchEnrollmentByDept(db), fetchTotalStudents(db)])
        response = buildEnrollmentByDeptResponse(data, total)
        break
      }
      case 'enrollment_by_program': {
        const [data, total] = await Promise.all([
          fetchEnrollmentByProgram(db),
          fetchTotalStudents(db),
        ])
        response = buildEnrollmentByProgramResponse(data, total)
        break
      }
      case 'growth_rate': {
        const { currentYear, currentCount, prevCount } = await fetchGrowthData(db)
        response = buildGrowthRateResponse(currentYear, currentCount, prevCount)
        break
      }
      case 'average_age': {
        const [avgAge, total] = await Promise.all([fetchAverageAge(db), fetchTotalStudents(db)])
        response = buildAverageAgeResponse(avgAge, total)
        break
      }
      default: {
        response = await buildAIResponse(trimmedMessage, db)
        break
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    )
  }
}

