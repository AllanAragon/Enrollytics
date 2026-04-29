import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Google Gemini API key is not configured. Please set GOOGLE_GEMINI_API_KEY in your environment.' },
      { status: 500 }
    )
  }

  let body: { message?: string; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { message, context } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }

  const trimmedMessage = message.trim().slice(0, 2000)

  const systemPrompt = `You are an AI assistant for Enrollytics, a Freshmen Enrollment Analytics System. 
Your role is to help administrators and staff understand student enrollment insights.
You must ONLY answer questions related to student enrollment data, academic programs, departments, enrollment trends, and related analytics.
Do NOT answer questions unrelated to enrollment or education analytics.
Always be concise, professional, and data-driven in your responses.

Here is the current enrollment data context:
${context || 'No data available.'}

Based on this enrollment data, answer the user's question.`

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.4,
      },
    })

    const result = await chat.sendMessage(`${systemPrompt}\n\nUser question: ${trimmedMessage}`)
    const response = result.response
    const text = response.text()

    return NextResponse.json({ reply: text })
  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: 'Failed to get a response from the AI. Please try again.' },
      { status: 500 }
    )
  }
}
