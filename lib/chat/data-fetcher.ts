import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'

type Db = SupabaseClient<Database> | null

export type YearCount = { year: number; count: number }
export type DeptCount = { code: string; name: string; count: number }
export type ProgramCount = { code: string; name: string; deptCode: string; count: number }

export type CompactSummary = {
  totalStudents: number
  averageAge: number
  currentYear: number
  currentYearCount: number
  prevYearCount: number
  enrollmentByYear: YearCount[]
  enrollmentByDept: DeptCount[]
  enrollmentByProgram: ProgramCount[]
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_RANGE = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 7 + i)

// ─── Mock data helpers ──────────────────────────────────────────────────────

function mockByYear(): YearCount[] {
  return YEAR_RANGE.map((year) => ({
    year,
    count: mockStudents.filter((s) => s.enrolled_year === year).length,
  }))
}

function mockByDept(): DeptCount[] {
  return mockDepartments.map((d) => {
    const deptPrograms = mockPrograms.filter((p) => p.department_id === d.id)
    const count = mockStudents.filter((s) => deptPrograms.some((p) => p.id === s.program_id)).length
    return { code: d.code, name: d.name, count }
  })
}

function mockByProgram(): ProgramCount[] {
  return mockPrograms
    .map((p) => {
      const dept = mockDepartments.find((d) => d.id === p.department_id)
      const count = mockStudents.filter((s) => s.program_id === p.id).length
      return { code: p.code, name: p.name, deptCode: dept?.code ?? 'N/A', count }
    })
    .sort((a, b) => b.count - a.count)
}

// ─── Targeted fetch functions ────────────────────────────────────────────────

export async function fetchTotalStudents(db: Db): Promise<number> {
  if (!db) return mockStudents.length
  const { count } = await db.from('students').select('*', { count: 'exact', head: true })
  return count ?? 0
}

export async function fetchEnrollmentByYear(db: Db): Promise<YearCount[]> {
  if (!db) return mockByYear()
  const results = await Promise.all(
    YEAR_RANGE.map((year) =>
      db
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('enrolled_year', year)
        .then((r) => ({ year, count: r.count ?? 0 }))
    )
  )
  return results
}

export async function fetchEnrollmentByDept(db: Db): Promise<DeptCount[]> {
  if (!db) return mockByDept()
  const [programsRes, departmentsRes] = await Promise.all([
    db.from('programs').select('id, department_id'),
    db.from('departments').select('id, code, name'),
  ])
  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []

  return Promise.all(
    departments.map(async (dept) => {
      const programIds = programs.filter((p) => p.department_id === dept.id).map((p) => p.id)
      if (programIds.length === 0) return { code: dept.code, name: dept.name, count: 0 }
      const { count } = await db
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('program_id', programIds)
      return { code: dept.code, name: dept.name, count: count ?? 0 }
    })
  )
}

export async function fetchEnrollmentByProgram(db: Db): Promise<ProgramCount[]> {
  if (!db) return mockByProgram()
  const [programsRes, departmentsRes] = await Promise.all([
    db.from('programs').select('id, code, name, department_id'),
    db.from('departments').select('id, code'),
  ])
  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []

  const results = await Promise.all(
    programs.map(async (p) => {
      const { count } = await db
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', p.id)
      const dept = departments.find((d) => d.id === p.department_id)
      return { code: p.code, name: p.name, deptCode: dept?.code ?? 'N/A', count: count ?? 0 }
    })
  )
  return results.sort((a, b) => b.count - a.count)
}

export async function fetchGrowthData(
  db: Db
): Promise<{ currentYear: number; currentCount: number; prevCount: number }> {
  if (!db) {
    return {
      currentYear: CURRENT_YEAR,
      currentCount: mockStudents.filter((s) => s.enrolled_year === CURRENT_YEAR).length,
      prevCount: mockStudents.filter((s) => s.enrolled_year === CURRENT_YEAR - 1).length,
    }
  }
  const [currentRes, prevRes] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }).eq('enrolled_year', CURRENT_YEAR),
    db.from('students').select('*', { count: 'exact', head: true }).eq('enrolled_year', CURRENT_YEAR - 1),
  ])
  return {
    currentYear: CURRENT_YEAR,
    currentCount: currentRes.count ?? 0,
    prevCount: prevRes.count ?? 0,
  }
}

export async function fetchAverageAge(db: Db): Promise<number> {
  if (!db) {
    const sum = mockStudents.reduce((acc, s) => acc + s.age, 0)
    return mockStudents.length > 0 ? sum / mockStudents.length : 0
  }
  const { data } = await db.from('students').select('age').limit(1000)
  if (!data || data.length === 0) return 0
  return data.reduce((acc, s) => acc + s.age, 0) / data.length
}

// ─── Compact summary (used for AI unknown-intent path) ───────────────────────

export async function fetchCompactSummary(db: Db): Promise<CompactSummary> {
  const [total, byYear, byDept, byProgram, growth, avgAge] = await Promise.all([
    fetchTotalStudents(db),
    fetchEnrollmentByYear(db),
    fetchEnrollmentByDept(db),
    fetchEnrollmentByProgram(db),
    fetchGrowthData(db),
    fetchAverageAge(db),
  ])
  return {
    totalStudents: total,
    averageAge: avgAge,
    currentYear: growth.currentYear,
    currentYearCount: growth.currentCount,
    prevYearCount: growth.prevCount,
    enrollmentByYear: byYear,
    enrollmentByDept: byDept,
    enrollmentByProgram: byProgram,
  }
}

export function summaryToText(s: CompactSummary): string {
  const growthRate =
    s.prevYearCount > 0
      ? (((s.currentYearCount - s.prevYearCount) / s.prevYearCount) * 100).toFixed(1) + '%'
      : 'N/A'

  return [
    `=== ENROLLYTICS DATA (${s.currentYear}) ===`,
    `Total Students: ${s.totalStudents}`,
    `Average Age: ${s.averageAge.toFixed(1)} yrs`,
    `${s.currentYear}: ${s.currentYearCount} students`,
    `${s.currentYear - 1}: ${s.prevYearCount} students`,
    `YoY Growth: ${growthRate}`,
    '',
    '-- Enrollment by Year --',
    ...s.enrollmentByYear.filter((y) => y.count > 0).map((y) => `  ${y.year}: ${y.count}`),
    '',
    '-- By Department --',
    ...s.enrollmentByDept.map((d) => `  ${d.code}: ${d.count}`),
    '',
    '-- By Program --',
    ...s.enrollmentByProgram.map((p) => `  ${p.code} [${p.deptCode}]: ${p.count}`),
  ].join('\n')
}
