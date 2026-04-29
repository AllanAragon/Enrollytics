import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'
import ChatbotInterface from '@/components/ChatbotInterface'

async function buildEnrollmentContext(): Promise<string> {
  const currentYear = new Date().getFullYear()

  let students = mockStudents
  let programs = mockPrograms
  let departments = mockDepartments
  let totalStudents = mockStudents.length

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      if (supabase) {
        const [studentsRes, programsRes, departmentsRes] = await Promise.all([
          supabase.from('students').select('*').limit(500),
          supabase.from('programs').select('*'),
          supabase.from('departments').select('*'),
        ])
        if (studentsRes.data) students = studentsRes.data
        if (programsRes.data) programs = programsRes.data
        if (departmentsRes.data) departments = departmentsRes.data
        totalStudents = students.length
      }
    } catch {
      // fall back to mock data
    }
  }

  // Build a text summary of the enrollment data
  const enrollmentByYear: Record<number, number> = {}
  for (const s of students) {
    enrollmentByYear[s.enrolled_year] = (enrollmentByYear[s.enrolled_year] || 0) + 1
  }

  const studentsByProgram = programs.map((p) => {
    const count = students.filter((s) => s.program_id === p.id).length
    const dept = departments.find((d) => d.id === p.department_id)
    return { name: p.name, code: p.code, dept: dept?.code ?? 'N/A', count }
  }).sort((a, b) => b.count - a.count)

  const studentsByDept = departments.map((d) => {
    const deptPrograms = programs.filter((p) => p.department_id === d.id)
    const count = students.filter((s) => deptPrograms.some((p) => p.id === s.program_id)).length
    return { name: d.name, code: d.code, count }
  })

  const avgAge =
    students.length > 0
      ? (students.reduce((sum, s) => sum + s.age, 0) / students.length).toFixed(1)
      : 'N/A'

  const currentYearCount = students.filter((s) => s.enrolled_year === currentYear).length
  const prevYearCount = students.filter((s) => s.enrolled_year === currentYear - 1).length
  const growthRate =
    prevYearCount > 0
      ? (((currentYearCount - prevYearCount) / prevYearCount) * 100).toFixed(1)
      : 'N/A'

  const lines: string[] = [
    `=== ENROLLYTICS DATA SUMMARY (as of ${currentYear}) ===`,
    `Total Students: ${totalStudents}`,
    `Average Student Age: ${avgAge} years`,
    `Current Year (${currentYear}) Enrollments: ${currentYearCount}`,
    `Previous Year (${currentYear - 1}) Enrollments: ${prevYearCount}`,
    `Year-over-Year Growth: ${growthRate}%`,
    '',
    '--- Enrollment by Year ---',
    ...Object.entries(enrollmentByYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, count]) => `  ${year}: ${count} students`),
    '',
    '--- Students by Department ---',
    ...studentsByDept.map(
      (d) =>
        `  ${d.code} (${d.name}): ${d.count} students`
    ),
    '',
    '--- Programs (sorted by enrollment) ---',
    ...studentsByProgram.map(
      (p) =>
        `  ${p.code} [${p.dept}] - ${p.name}: ${p.count} students`
    ),
  ]

  return lines.join('\n')
}

export default async function ChatbotPage() {
  const enrollmentContext = await buildEnrollmentContext()
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
              .
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
        <ChatbotInterface enrollmentContext={enrollmentContext} />
      </div>
    </div>
  )
}
