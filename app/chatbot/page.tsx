import ChatbotInterface from '@/components/ChatbotInterface'

export default function ChatbotPage() {
  const isConfigured = !!process.env.GOOGLE_GEMINI_API_KEY

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Enrollment Assistant</h1>
        <p className="text-gray-500 mt-2">
          Ask questions about student enrollment data powered by Google Gemini AI
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="text-amber-800 font-medium text-sm">Google Gemini API key not configured</p>
            <p className="text-amber-700 text-xs mt-1">
              Add <code className="bg-amber-100 px-1 rounded">GOOGLE_GEMINI_API_KEY</code> to your{' '}
              <code className="bg-amber-100 px-1 rounded">.env.local</code> file to enable AI responses. You can
              obtain a free API key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google AI Studio
              </a>
              . Common enrollment questions are answered instantly without an API key.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatbotInterface />
      </div>
    </div>
  )
}

