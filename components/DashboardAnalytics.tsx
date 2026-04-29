'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'
import type { Program, Department } from '@/types/database'

type EnrollmentByYear = { year: number; count: number }
type DeptStats = { id: string; code: string; name: string; count: number }
type ProgramStats = { id: string; code: string; name: string; deptCode: string; count: number }

export default function DashboardAnalytics() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [enrollmentByYear, setEnrollmentByYear] = useState<EnrollmentByYear[]>([])
  const [studentsByDept, setStudentsByDept] = useState<DeptStats[]>([])
  const [studentsByProgram, setStudentsByProgram] = useState<ProgramStats[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [currentYearCount, setCurrentYearCount] = useState(0)
  const [previousYearCount, setPreviousYearCount] = useState(0)
  const [avgAge, setAvgAge] = useState('0')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    const currentYear = new Date().getFullYear()
    
    if (!supabase) {
      // Fallback to mock data calculations
      const students = mockStudents
      setPrograms(mockPrograms)
      setDepartments(mockDepartments)
      
      // Calculate from mock data
      const yearData = Array.from({ length: 7 }, (_, i) => {
        const year = 2020 + i
        const count = students.filter(s => s.enrolled_year === year).length
        return { year, count }
      })
      setEnrollmentByYear(yearData)
      
      const deptData = mockDepartments.map(dept => {
        const deptPrograms = mockPrograms.filter(p => p.department_id === dept.id)
        const count = students.filter(s => deptPrograms.some(p => p.id === s.program_id)).length
        return { id: dept.id, code: dept.code, name: dept.name, count }
      })
      setStudentsByDept(deptData)
      
      const programData = mockPrograms.map(program => {
        const count = students.filter(s => s.program_id === program.id).length
        const dept = mockDepartments.find(d => d.id === program.department_id)
        return { id: program.id, code: program.code, name: program.name, deptCode: dept?.code || 'N/A', count }
      }).sort((a, b) => b.count - a.count).slice(0, 5)
      setStudentsByProgram(programData)
      
      setTotalStudents(students.length)
      setCurrentYearCount(students.filter(s => s.enrolled_year === currentYear).length)
      setPreviousYearCount(students.filter(s => s.enrolled_year === currentYear - 1).length)
      setAvgAge((students.reduce((sum, s) => sum + s.age, 0) / students.length).toFixed(1))
      setLoading(false)
      return
    }

    try {
      // Fetch programs and departments (lightweight)
      const [programsRes, departmentsRes] = await Promise.all([
        supabase.from('programs').select('*'),
        supabase.from('departments').select('*')
      ])
      
      const progs = programsRes.data || []
      const depts = departmentsRes.data || []
      setPrograms(progs)
      setDepartments(depts)

      // Aggregate query 1: Total student count
      const { count: total } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
      setTotalStudents(total || 0)

      // Aggregate query 2: Enrollment by year (2020-2026)
      const yearPromises = Array.from({ length: 7 }, async (_, i) => {
        const year = 2020 + i
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('enrolled_year', year)
        return { year, count: count || 0 }
      })
      const yearData = await Promise.all(yearPromises)
      setEnrollmentByYear(yearData)

      // Aggregate query 3: Current and previous year counts
      const [currentRes, previousRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('enrolled_year', currentYear),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('enrolled_year', currentYear - 1)
      ])
      setCurrentYearCount(currentRes.count || 0)
      setPreviousYearCount(previousRes.count || 0)

      // Aggregate query 4: Students by department
      const deptPromises = depts.map(async (dept) => {
        const deptPrograms = progs.filter(p => p.department_id === dept.id)
        const programIds = deptPrograms.map(p => p.id)
        
        if (programIds.length === 0) {
          return { id: dept.id, code: dept.code, name: dept.name, count: 0 }
        }
        
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('program_id', programIds)
        
        return { id: dept.id, code: dept.code, name: dept.name, count: count || 0 }
      })
      const deptData = await Promise.all(deptPromises)
      setStudentsByDept(deptData)

      // Aggregate query 5: Students by program (top 5)
      const programPromises = progs.map(async (program) => {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)
        
        const dept = depts.find(d => d.id === program.department_id)
        return { 
          id: program.id, 
          code: program.code, 
          name: program.name, 
          deptCode: dept?.code || 'N/A', 
          count: count || 0 
        }
      })
      const programData = await Promise.all(programPromises)
      const topPrograms = programData.sort((a, b) => b.count - a.count).slice(0, 5)
      setStudentsByProgram(topPrograms)

      // Aggregate query 6: Average age using RPC or calculate from limited sample
      // Note: Supabase doesn't have direct AVG in JS client for single column
      // We'll use a lighter approach - fetch only age column with limit
      const { data: ageData } = await supabase
        .from('students')
        .select('age')
        .limit(5000) // Sample up to 5000 for average calculation
      
      if (ageData && ageData.length > 0) {
        const average = ageData.reduce((sum, s) => sum + s.age, 0) / ageData.length
        setAvgAge(average.toFixed(1))
      } else {
        setAvgAge('0')
      }

    } catch (error) {
      console.error('Analytics fetch error:', error)
      // Fallback to empty/zero values
      setTotalStudents(0)
      setEnrollmentByYear(Array.from({ length: 7 }, (_, i) => ({ year: 2020 + i, count: 0 })))
      setStudentsByDept([])
      setStudentsByProgram([])
      setCurrentYearCount(0)
      setPreviousYearCount(0)
      setAvgAge('0')
    }
    
    setLoading(false)
  }

  // Calculate derived values
  const maxEnrollment = Math.max(...enrollmentByYear.map(e => e.count), 1)
  const maxDeptCount = Math.max(...studentsByDept.map(d => d.count), 1)
  const maxProgramCount = Math.max(...studentsByProgram.map(p => p.count), 1)
  const growthAbsolute = currentYearCount - previousYearCount
  const growthRate = previousYearCount > 0 
    ? ((currentYearCount - previousYearCount) / previousYearCount * 100).toFixed(1)
    : '0'
  const currentYear = new Date().getFullYear()

  // Analytics object for rendering
  const analytics = {
    enrollmentByYear,
    maxEnrollment,
    studentsByDept,
    maxDeptCount,
    totalStudents: totalStudents || 1,
    studentsByProgram,
    maxProgramCount,
    currentYearCount,
    previousYearCount,
    growthRate,
    growthAbsolute,
    avgAge,
    currentYear
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Year Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Current Year ({analytics.currentYear})</div>
          <div className="text-3xl font-bold text-indigo-600">{analytics.currentYearCount}</div>
          <div className="text-xs text-gray-400 mt-1">students enrolled</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Previous Year ({analytics.currentYear - 1})</div>
          <div className="text-3xl font-bold text-gray-700">{analytics.previousYearCount}</div>
          <div className="text-xs text-gray-400 mt-1">students enrolled</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Year-over-Year Growth</div>
          <div className="flex items-baseline gap-2">
            <div className={`text-3xl font-bold ${Number(analytics.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(analytics.growthRate) >= 0 ? '+' : ''}{analytics.growthRate}%
            </div>
            <div className={`text-sm ${Number(analytics.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({analytics.growthAbsolute >= 0 ? '+' : ''}{analytics.growthAbsolute})
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Enrollment Trends (2020-{analytics.currentYear})</h3>
        <div className="space-y-3">
          {analytics.enrollmentByYear.map((item) => (
            <div key={item.year} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-gray-700">{item.year}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500"
                  style={{ width: `${(item.count / analytics.maxEnrollment) * 100}%`, minWidth: item.count > 0 ? '40px' : '0' }}
                >
                  {item.count > 0 && item.count}
                </div>
              </div>
              <div className="w-20 text-right text-sm text-gray-500">
                {analytics.totalStudents > 0 ? ((item.count / analytics.totalStudents) * 100).toFixed(1) : 0}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Department */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Students by Department</h3>
          <div className="space-y-4">
            {analytics.studentsByDept.map((dept) => (
              <div key={dept.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{dept.code}</div>
                    <div className="text-xs text-gray-500">{dept.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{dept.count}</div>
                    <div className="text-xs text-gray-500">
                      {((dept.count / analytics.totalStudents) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(dept.count / analytics.maxDeptCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Programs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top 5 Programs by Enrollment</h3>
          <div className="space-y-4">
            {analytics.studentsByProgram.map((program, index) => (
              <div key={program.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{program.code}</div>
                      <div className="text-xs text-gray-500">{program.deptCode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{program.count}</div>
                    <div className="text-xs text-gray-500">
                      {((program.count / analytics.totalStudents) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(program.count / analytics.maxProgramCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Total Students</div>
          <div className="text-3xl font-bold">{analytics.totalStudents}</div>
          <div className="text-xs opacity-75 mt-1">across all years</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Average Age</div>
          <div className="text-3xl font-bold">{analytics.avgAge}</div>
          <div className="text-xs opacity-75 mt-1">years old</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Active Programs</div>
          <div className="text-3xl font-bold">{programs.length}</div>
          <div className="text-xs opacity-75 mt-1">across {departments.length} departments</div>
        </div>
      </div>
    </div>
  )
}
