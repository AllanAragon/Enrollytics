import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'

type Db = SupabaseClient<Database> | null

export type YearCount = { year: number; count: number }
export type DeptCount = { code: string; name: string; count: number }
export type ProgramCount = { code: string; name: string; deptCode: string; count: number }

// Enhanced contextual enrollment data by Department, Program, and Year
export type EnrollmentByDeptProgramYear = {
  dept: string
  deptName: string
  program: string
  programName: string
  data: Record<number, number> // { year: countOfEnrolled }
  genderData: {
    male: Record<number, number>    // { year: maleCount }
    female: Record<number, number>  // { year: femaleCount }
  }
}

// Demographic statistics
export type AgeDistribution = {
  ageRange: string
  count: number
  percentage: number
}

export type LocationDistribution = {
  city: string
  count: number
  percentage: number
}

export type GenderDistribution = {
  gender: 'Male' | 'Female'
  count: number
  percentage: number
}

export type DemographicStats = {
  averageAge: number
  minAge: number
  maxAge: number
  ageDistribution: AgeDistribution[]
  locationDistribution: LocationDistribution[]
  genderDistribution: GenderDistribution[]
}

// Insight view aggregated data: Program -> City -> Year -> Count
export type InsightViewData = {
  [programCode: string]: {
    [city: string]: {
      [year: number]: number
    }
  }
}

export type CompactSummary = {
  totalStudents: number
  averageAge: number
  currentYear: number
  currentYearCount: number
  prevYearCount: number
  enrollmentByYear: YearCount[]
  enrollmentByDept: DeptCount[]
  enrollmentByProgram: ProgramCount[]
  demographics: DemographicStats
  insightView: InsightViewData
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

function mockEnrollmentByDeptProgramYear(): EnrollmentByDeptProgramYear[] {
  const results: EnrollmentByDeptProgramYear[] = []
  
  for (const program of mockPrograms) {
    const dept = mockDepartments.find((d) => d.id === program.department_id)
    if (!dept) continue
    
    const yearData: Record<number, number> = {}
    const maleData: Record<number, number> = {}
    const femaleData: Record<number, number> = {}
    
    for (const year of YEAR_RANGE) {
      const studentsInYear = mockStudents.filter(
        (s) => s.program_id === program.id && s.enrolled_year === year
      )
      
      yearData[year] = studentsInYear.length
      maleData[year] = studentsInYear.filter((s) => s.gender === 'Male').length
      femaleData[year] = studentsInYear.filter((s) => s.gender === 'Female').length
    }
    
    results.push({
      dept: dept.code,
      deptName: dept.name,
      program: program.code,
      programName: program.name,
      data: yearData,
      genderData: {
        male: maleData,
        female: femaleData,
      },
    })
  }
  
  return results
}

function mockDemographics(): DemographicStats {
  const ages = mockStudents.map((s) => s.age)
  const total = mockStudents.length
  
  // Age statistics
  const minAge = Math.min(...ages)
  const maxAge = Math.max(...ages)
  const averageAge = ages.reduce((sum, age) => sum + age, 0) / total
  
  // Age distribution (group by ranges)
  const ageRanges = [
    { range: '18-19', min: 18, max: 19 },
    { range: '20-21', min: 20, max: 21 },
    { range: '22+', min: 22, max: 100 },
  ]
  
  const ageDistribution: AgeDistribution[] = ageRanges.map(({ range, min, max }) => {
    const count = mockStudents.filter((s) => s.age >= min && s.age <= max).length
    return {
      ageRange: range,
      count,
      percentage: (count / total) * 100,
    }
  })
  
  // Location distribution (extract city from address)
  const locationMap = new Map<string, number>()
  for (const student of mockStudents) {
    const city = student.address.split(',')[1]?.trim() || 'Unknown'
    locationMap.set(city, (locationMap.get(city) || 0) + 1)
  }
  
  const locationDistribution: LocationDistribution[] = Array.from(locationMap.entries())
    .map(([city, count]) => ({
      city,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
  
  // Gender distribution
  const maleCount = mockStudents.filter((s) => s.gender === 'Male').length
  const femaleCount = mockStudents.filter((s) => s.gender === 'Female').length
  
  const genderDistribution: GenderDistribution[] = [
    {
      gender: 'Male',
      count: maleCount,
      percentage: (maleCount / total) * 100,
    },
    {
      gender: 'Female',
      count: femaleCount,
      percentage: (femaleCount / total) * 100,
    },
  ]
  
  return {
    averageAge,
    minAge,
    maxAge,
    ageDistribution,
    locationDistribution,
    genderDistribution,
  }
}

function mockInsightView(): InsightViewData {
  const result: InsightViewData = {}
  
  for (const student of mockStudents) {
    const program = mockPrograms.find((p) => p.id === student.program_id)
    const dept = program ? mockDepartments.find((d) => d.id === program.department_id) : null
    
    if (!program || !dept) continue
    
    const programCode = program.code
    const city = student.address
    const year = student.enrolled_year
    
    // Initialize program if not exists
    if (!result[programCode]) {
      result[programCode] = {}
    }
    
    // Initialize city if not exists
    if (!result[programCode][city]) {
      result[programCode][city] = {}
    }
    
    // Increment year count
    if (!result[programCode][city][year]) {
      result[programCode][city][year] = 0
    }
    result[programCode][city][year]++
  }
  
  return result
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
  // Fetch all ages without a limit for accurate average
  const { data } = await db.from('students').select('age')
  if (!data || data.length === 0) return 0
  return data.reduce((acc, s) => acc + s.age, 0) / data.length
}

export async function fetchDemographics(db: Db): Promise<DemographicStats> {
  if (!db) return mockDemographics()
  
  // Fetch all student data for demographics
  const { data: students } = await db.from('students').select('age, gender, address')
  if (!students || students.length === 0) {
    return {
      averageAge: 0,
      minAge: 0,
      maxAge: 0,
      ageDistribution: [],
      locationDistribution: [],
      genderDistribution: [],
    }
  }
  
  const total = students.length
  const ages = students.map((s) => s.age)
  
  // Age statistics
  const minAge = Math.min(...ages)
  const maxAge = Math.max(...ages)
  const averageAge = ages.reduce((sum, age) => sum + age, 0) / total
  
  // Age distribution
  const ageRanges = [
    { range: '18-19', min: 18, max: 19 },
    { range: '20-21', min: 20, max: 21 },
    { range: '22+', min: 22, max: 100 },
  ]
  
  const ageDistribution: AgeDistribution[] = ageRanges.map(({ range, min, max }) => {
    const count = students.filter((s) => s.age >= min && s.age <= max).length
    return {
      ageRange: range,
      count,
      percentage: (count / total) * 100,
    }
  })
  
  // Location distribution (extract city from address)
  const locationMap = new Map<string, number>()
  for (const student of students) {
    const city = student.address?.split(',')[1]?.trim() || 'Unknown'
    locationMap.set(city, (locationMap.get(city) || 0) + 1)
  }
  
  const locationDistribution: LocationDistribution[] = Array.from(locationMap.entries())
    .map(([city, count]) => ({
      city,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
  
  // Gender distribution
  const maleCount = students.filter((s) => s.gender === 'Male').length
  const femaleCount = students.filter((s) => s.gender === 'Female').length
  
  const genderDistribution: GenderDistribution[] = [
    {
      gender: 'Male',
      count: maleCount,
      percentage: (maleCount / total) * 100,
    },
    {
      gender: 'Female',
      count: femaleCount,
      percentage: (femaleCount / total) * 100,
    },
  ]
  
  return {
    averageAge,
    minAge,
    maxAge,
    ageDistribution,
    locationDistribution,
    genderDistribution,
  }
}

export async function fetchInsightView(db: Db): Promise<InsightViewData> {
  if (!db) return mockInsightView()
  
  // Fetch students with related program and department data
  const { data: students } = await db
    .from('students')
    .select(`
      address,
      enrolled_year,
      program_id,
      programs (
        code,
        department_id,
        departments (
          code
        )
      )
    `)
  
  if (!students || students.length === 0) return {}
  
  // Aggregate into nested structure
  const result: InsightViewData = {}
  
  for (const student of students) {
    const program = student.programs as any
    const department = program?.departments as any
    
    if (!program?.code || !department?.code || !student.address || !student.enrolled_year) continue
    
    const programCode = program.code
    const city = student.address
    const year = student.enrolled_year
    
    // Initialize program if not exists
    if (!result[programCode]) {
      result[programCode] = {}
    }
    
    // Initialize city if not exists
    if (!result[programCode][city]) {
      result[programCode][city] = {}
    }
    
    // Increment year count
    if (!result[programCode][city][year]) {
      result[programCode][city][year] = 0
    }
    result[programCode][city][year]++
  }
  
  return result
}

// ─── Enhanced contextual enrollment data ─────────────────────────────────────

export async function fetchEnrollmentByDeptProgramYear(
  db: Db
): Promise<EnrollmentByDeptProgramYear[]> {
  if (!db) return mockEnrollmentByDeptProgramYear()
  
  // Fetch all base data
  const [programsRes, departmentsRes] = await Promise.all([
    db.from('programs').select('id, code, name, department_id'),
    db.from('departments').select('id, code, name'),
  ])
  
  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []
  
  // For each program, fetch enrollment counts by year
  const results = await Promise.all(
    programs.map(async (program) => {
      const dept = departments.find((d) => d.id === program.department_id)
      if (!dept) return null
      
      const yearData: Record<number, number> = {}
      const maleData: Record<number, number> = {}
      const femaleData: Record<number, number> = {}
      
      // Fetch counts for each year in parallel
      const yearCountsPromises = YEAR_RANGE.map(async (year) => {
        const [totalRes, maleRes, femaleRes] = await Promise.all([
          db
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', program.id)
            .eq('enrolled_year', year),
          db
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', program.id)
            .eq('enrolled_year', year)
            .eq('gender', 'Male'),
          db
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', program.id)
            .eq('enrolled_year', year)
            .eq('gender', 'Female'),
        ])
        
        return {
          year,
          total: totalRes.count ?? 0,
          male: maleRes.count ?? 0,
          female: femaleRes.count ?? 0,
        }
      })
      
      const yearCounts = await Promise.all(yearCountsPromises)
      
      // Build the data objects
      for (const { year, total, male, female } of yearCounts) {
        yearData[year] = total
        maleData[year] = male
        femaleData[year] = female
      }
      
      return {
        dept: dept.code,
        deptName: dept.name,
        program: program.code,
        programName: program.name,
        data: yearData,
        genderData: {
          male: maleData,
          female: femaleData,
        },
      }
    })
  )
  
  return results.filter((r): r is EnrollmentByDeptProgramYear => r !== null)
}

// ─── Compact summary (used for AI unknown-intent path) ───────────────────────

export async function fetchCompactSummary(db: Db): Promise<CompactSummary> {
  const [total, byYear, byDept, byProgram, growth, avgAge, demographics, insightView] = await Promise.all([
    fetchTotalStudents(db),
    fetchEnrollmentByYear(db),
    fetchEnrollmentByDept(db),
    fetchEnrollmentByProgram(db),
    fetchGrowthData(db),
    fetchAverageAge(db),
    fetchDemographics(db),
    fetchInsightView(db),
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
    demographics,
    insightView,
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
    '-- Demographics --',
    `Age Range: ${s.demographics.minAge}-${s.demographics.maxAge} years`,
    `Average Age: ${s.demographics.averageAge.toFixed(1)} years`,
    '',
    'Gender Distribution:',
    ...s.demographics.genderDistribution.map((g) => `  ${g.gender}: ${g.count} (${g.percentage.toFixed(1)}%)`),
    '',
    'Age Distribution:',
    ...s.demographics.ageDistribution.map((a) => `  ${a.ageRange}: ${a.count} (${a.percentage.toFixed(1)}%)`),
    '',
    'Location Distribution:',
    ...s.demographics.locationDistribution.map((l) => `  ${l.city}: ${l.count} (${l.percentage.toFixed(1)}%)`),
    '',
    '-- Enrollment by Year --',
    ...s.enrollmentByYear.filter((y) => y.count > 0).map((y) => `  ${y.year}: ${y.count}`),
    '',
    '-- By Department --',
    ...s.enrollmentByDept.map((d) => `  ${d.code}: ${d.count}`),
    '',
    '-- By Program --',
    ...s.enrollmentByProgram.map((p) => `  ${p.code} [${p.deptCode}]: ${p.count}`),
    '',
    '-- Insight View: Program → City → Year → Count --',
    ...(() => {
      const lines: string[] = []
      for (const [program, cities] of Object.entries(s.insightView)) {
        lines.push(`  ${program}:`)
        for (const [city, years] of Object.entries(cities)) {
          const yearStr = Object.entries(years)
            .map(([year, count]) => `${year}:${count}`)
            .join(', ')
          lines.push(`    ${city}: {${yearStr}}`)
        }
      }
      return lines
    })(),
  ].join('\n')
}

export function enrollmentByDeptProgramYearToText(data: EnrollmentByDeptProgramYear[]): string {
  const lines = ['=== ENROLLMENT BY DEPARTMENT, PROGRAM & YEAR (with Gender) ===', '']
  
  // Group by department
  const byDept = new Map<string, EnrollmentByDeptProgramYear[]>()
  for (const item of data) {
    const items = byDept.get(item.dept) ?? []
    items.push(item)
    byDept.set(item.dept, items)
  }
  
  // Output each department and its programs
  for (const [deptCode, programs] of byDept) {
    const deptName = programs[0]?.deptName ?? deptCode
    lines.push(`-- ${deptCode} (${deptName}) --`)
    
    for (const program of programs) {
      lines.push(`  ${program.program} - ${program.programName}`)
      
      // Get years with enrollments
      const yearsWithData = Object.entries(program.data)
        .sort(([a], [b]) => Number(a) - Number(b))
        .filter(([_, count]) => count > 0)
      
      if (yearsWithData.length > 0) {
        for (const [year, total] of yearsWithData) {
          const male = program.genderData.male[Number(year)] || 0
          const female = program.genderData.female[Number(year)] || 0
          lines.push(`    ${year}: ${total} total (M: ${male}, F: ${female})`)
        }
      } else {
        lines.push(`    No enrollments`)
      }
    }
    lines.push('')
  }
  
  return lines.join('\n')
}
