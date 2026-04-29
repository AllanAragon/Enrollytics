'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'
import { Student, Program, Department } from '@/types/database'
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon, UploadIcon, DownloadIcon } from '@/components/Icons'
import * as XLSX from 'xlsx'

const currentYear = new Date().getFullYear()
const emptyForm = {
  first_name: '',
  last_name: '',
  age: '',
  address: '',
  enrolled_year: String(currentYear),
  program_id: '',
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(isSupabaseConfigured ? [] : mockStudents)
  const [programs, setPrograms] = useState<Program[]>(isSupabaseConfigured ? [] : mockPrograms)
  const [departments, setDepartments] = useState<Department[]>(isSupabaseConfigured ? [] : mockDepartments)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  
  // Bulk upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ success: number; errors: string[] } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Filter states - Default to current year
  const [filterYear, setFilterYear] = useState<string>(String(currentYear))
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterProgram, setFilterProgram] = useState<string>('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch data when year filter changes
  useEffect(() => {
    if (filterYear) {
      fetchData(parseInt(filterYear))
    }
  }, [filterYear])

  async function fetchData(year?: number) {
    setLoading(true)
    const targetYear = year || currentYear // Default to current year
    
    const supabase = createClient()
    if (!supabase) {
      // Mock mode - filter by year
      setStudents(year ? mockStudents.filter(s => s.enrolled_year === year) : mockStudents.filter(s => s.enrolled_year === currentYear))
      setPrograms(mockPrograms)
      setDepartments(mockDepartments)
      setLoading(false)
      return
    }
    
    // Query only the selected year from database
    const [studentsRes, programsRes, deptsRes] = await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('enrolled_year', targetYear)
        .order('created_at', { ascending: false }),
      supabase.from('programs').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
    ])
    setStudents(studentsRes.data || [])
    setPrograms(programsRes.data || mockPrograms)
    setDepartments(deptsRes.data || mockDepartments)
    setLoading(false)
  }

  function getProgramName(id: string | null) {
    if (!id) return '—'
    return programs.find(p => p.id === id)?.code || '—'
  }

  function getDepartmentName(programId: string | null) {
    if (!programId) return '—'
    const program = programs.find(p => p.id === programId)
    if (!program || !program.department_id) return '—'
    return departments.find(d => d.id === program.department_id)?.code || '—'
  }

  // Filtered students based on selected filters (department and program only, year is handled by DB query)
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Filter by program
      if (filterProgram && student.program_id !== filterProgram) {
        return false
      }
      
      // Filter by department (check if student's program belongs to selected department)
      if (filterDepartment && student.program_id) {
        const program = programs.find(p => p.id === student.program_id)
        if (!program || program.department_id !== filterDepartment) {
          return false
        }
      }
      
      return true
    })
  }, [students, filterDepartment, filterProgram, programs])

  // Fixed year range: 2020 to current year
  const availableYears = useMemo(() => {
    const years = []
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year)
    }
    return years
  }, [])

  // Get programs filtered by selected department
  const availablePrograms = useMemo(() => {
    if (!filterDepartment) return programs
    return programs.filter(p => p.department_id === filterDepartment)
  }, [programs, filterDepartment])

  // Clear all filters
  function clearFilters() {
    setFilterYear(String(currentYear)) // Reset to current year instead of empty
    setFilterDepartment('')
    setFilterProgram('')
    setCurrentPage(1) // Reset to first page
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterDepartment, filterProgram])

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      age: String(student.age),
      address: student.address,
      enrolled_year: String(student.enrolled_year),
      program_id: student.program_id || '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required.')
      return
    }
    const age = parseInt(form.age)
    const enrolled_year = parseInt(form.enrolled_year)
    if (isNaN(age) || age < 1 || age > 120) {
      setError('Please enter a valid age.')
      return
    }
    if (isNaN(enrolled_year) || enrolled_year < 1900 || enrolled_year > currentYear + 1) {
      setError('Please enter a valid enrolled year.')
      return
    }
    if (!form.address.trim()) {
      setError('Address is required.')
      return
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      age,
      address: form.address,
      enrolled_year,
      program_id: form.program_id || null,
    }

    const supabase = createClient()
    if (!supabase) {
      if (editing) {
        setStudents(prev => prev.map(s => s.id === editing.id ? { ...s, ...payload } : s))
      } else {
        const newStudent: Student = {
          id: Date.now().toString(),
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setStudents(prev => [newStudent, ...prev])
      }
      setShowModal(false)
      return
    }

    if (editing) {
      const { error } = await supabase.from('students').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); return }
    } else {
      const { error } = await supabase.from('students').insert([payload])
      if (error) { setError(error.message); return }
    }
    setShowModal(false)
    fetchData(parseInt(filterYear)) // Refresh with current year filter
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this student?')) return
    const supabase = createClient()
    if (!supabase) {
      setStudents(prev => prev.filter(s => s.id !== id))
      return
    }
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) { alert(error.message); return }
    fetchData(parseInt(filterYear)) // Refresh with current year filter
  }

  // Download template function
  function downloadTemplate() {
    const template = [
      {
        'First Name': 'Juan',
        'Last Name': 'dela Cruz',
        'Age': 18,
        'Address': '123 Main St, City, Province',
        'Enrolled Year': currentYear,
        'Program Code': 'BSCS'
      },
      {
        'First Name': 'Maria',
        'Last Name': 'Santos',
        'Age': 19,
        'Address': '456 Oak Ave, City, Province',
        'Enrolled Year': currentYear,
        'Program Code': 'BSIT'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'student_upload_template.xlsx')
  }

  // Handle bulk upload
  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const errors: string[] = []
      const validStudents: any[] = []

      jsonData.forEach((row, index) => {
        const rowNum = index + 2 // Excel row number (accounting for header)
        
        // Validate required fields
        if (!row['First Name'] || !row['Last Name']) {
          errors.push(`Row ${rowNum}: First Name and Last Name are required`)
          return
        }
        if (!row['Age'] || isNaN(row['Age']) || row['Age'] < 1 || row['Age'] > 120) {
          errors.push(`Row ${rowNum}: Invalid age`)
          return
        }
        if (!row['Address']) {
          errors.push(`Row ${rowNum}: Address is required`)
          return
        }
        if (!row['Enrolled Year'] || isNaN(row['Enrolled Year'])) {
          errors.push(`Row ${rowNum}: Invalid enrolled year`)
          return
        }

        // Find program by code
        let program_id = null
        if (row['Program Code']) {
          const program = programs.find(p => p.code.toUpperCase() === String(row['Program Code']).toUpperCase())
          if (!program) {
            errors.push(`Row ${rowNum}: Program code "${row['Program Code']}" not found`)
            return
          }
          program_id = program.id
        }

        validStudents.push({
          first_name: String(row['First Name']).trim(),
          last_name: String(row['Last Name']).trim(),
          age: parseInt(row['Age']),
          address: String(row['Address']).trim(),
          enrolled_year: parseInt(row['Enrolled Year']),
          program_id
        })
      })

      if (validStudents.length === 0) {
        setUploadStatus({ success: 0, errors })
        setIsUploading(false)
        return
      }

      // Insert students
      const supabase = createClient()
      if (!supabase) {
        // Mock mode - add to local state
        const newStudents = validStudents.map(s => ({
          id: Date.now().toString() + Math.random(),
          ...s,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
        setStudents(prev => [...newStudents, ...prev])
        setUploadStatus({ success: validStudents.length, errors })
      } else {
        const { error: insertError } = await supabase.from('students').insert(validStudents)
        if (insertError) {
          errors.push(`Database error: ${insertError.message}`)
          setUploadStatus({ success: 0, errors })
        } else {
          setUploadStatus({ success: validStudents.length, errors })
          await fetchData(parseInt(filterYear)) // Refresh with current year filter
        }
      }
    } catch (error) {
      setUploadStatus({ success: 0, errors: [`Error reading file: ${error}`] })
    }

    setIsUploading(false)
    // Reset file input
    e.target.value = ''
  }

  const years = Array.from({ length: 10 }, (_, i) => currentYear + 1 - i)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">Manage freshmen student records</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <UploadIcon className="w-5 h-5" />
            Bulk Upload
          </button>
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Student
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter Students</h3>
          {(filterYear !== String(currentYear) || filterDepartment || filterProgram) && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <XIcon className="w-4 h-4" />
              Reset Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Enrolled Year</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              value={filterDepartment}
              onChange={e => {
                setFilterDepartment(e.target.value)
                setFilterProgram('') // Reset program filter when department changes
              }}
              className="w-full border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
            <select
              value={filterProgram}
              onChange={e => setFilterProgram(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={!!filterDepartment && availablePrograms.length === 0}
            >
              <option value="">All Programs</option>
              {availablePrograms.map(prog => (
                <option key={prog.id} value={prog.id}>{prog.name} ({prog.code})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students for year {filterYear}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium">Per page:</label>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : paginatedStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filteredStudents.length === 0 ? (
              students.length === 0 ? 'No students found. Add one to get started.' : 'No students match the selected filters.'
            ) : 'No students on this page.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Age</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Enrolled Year</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Program</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Address</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{student.first_name} {student.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{student.age}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">{student.enrolled_year}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{getDepartmentName(student.program_id)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{getProgramName(student.program_id)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">{student.address}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(student)} className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      <EditIcon className="w-4 h-4" /> 
                    </button>
                    <button onClick={() => handleDelete(student.id)} className="inline-flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      <TrashIcon className="w-4 h-4" /> 
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && filteredStudents.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editing ? 'Edit Student' : 'Add Student'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="dela Cruz"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                    placeholder="18"
                    min="1"
                    max="120"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Enrolled Year <span className="text-red-500">*</span></label>
                  <select
                    value={form.enrolled_year}
                    onChange={e => setForm(f => ({ ...f, enrolled_year: e.target.value }))}
                    className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                    required
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Address <span className="text-red-500">*</span></label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  rows={2}
                  placeholder="123 Main St, City, Province"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Program / Course</label>
                <select
                  value={form.program_id}
                  onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2">
                  {editing ? <><CheckIcon className="w-5 h-5" /> Update Student</> : <><PlusIcon className="w-5 h-5" /> Add Student</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-400 bg-white text-gray-700 py-3 rounded-lg hover:bg-gray-100 font-semibold transition-all inline-flex items-center justify-center gap-2">
                  <XIcon className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Students</h2>
              <p className="text-sm text-gray-600 mt-1">Upload multiple students at once using an Excel file</p>
            </div>
            
            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Upload Section - First and Most Prominent */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <UploadIcon className="w-6 h-6" />
                  Upload Your Excel File
                </h3>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-gray-900 border-2 border-indigo-400 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-3 file:px-6 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                  {isUploading && (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      Processing file...
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Results - Show immediately after upload */}
              {uploadStatus && (
                <div className="space-y-3">
                  {uploadStatus.success > 0 && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <p className="text-green-800 font-semibold text-lg">
                        ✓ Successfully uploaded {uploadStatus.success} student{uploadStatus.success !== 1 ? 's' : ''}!
                      </p>
                    </div>
                  )}
                  {uploadStatus.errors.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <p className="text-red-800 font-semibold mb-2">
                        ⚠ Errors found ({uploadStatus.errors.length}):
                      </p>
                      <div className="max-h-40 overflow-y-auto bg-white rounded p-3">
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {uploadStatus.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Download Template */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <DownloadIcon className="w-5 h-5" />
                  Need the Template?
                </h3>
                <p className="text-sm text-gray-600 mb-3">Download the Excel template with sample data to get started</p>
                <button
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold shadow-sm hover:shadow-md transition-all inline-flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Download Excel Template
                </button>
              </div>

              {/* Instructions - Collapsible/Compact */}
              <details className="bg-blue-50 border border-blue-200 rounded-lg">
                <summary className="p-4 cursor-pointer font-semibold text-blue-900 hover:bg-blue-100 rounded-lg transition-colors">
                  📋 How to use (click to expand)
                </summary>
                <div className="px-4 pb-4">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Download the Excel template using the button above</li>
                    <li>Fill in your student data</li>
                    <li>Use program codes (BSCS, BSIT, etc.) in the "Program Code" column</li>
                    <li>Save the file and upload it using the file picker at the top</li>
                    <li>Review the results and fix any errors if needed</li>
                  </ol>
                </div>
              </details>

              {/* Available Program Codes - Collapsible/Compact */}
              <details className="bg-gray-50 border border-gray-200 rounded-lg">
                <summary className="p-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  🎓 Available Program Codes (click to view)
                </summary>
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {programs.map(prog => (
                      <span key={prog.id} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
                        {prog.code}
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkUpload(false)
                  setUploadStatus(null)
                }}
                className="w-full border-2 border-gray-400 bg-white text-gray-700 py-3 rounded-lg hover:bg-gray-100 font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
