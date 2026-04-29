'use client'

import { useState, useEffect } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockStudents, mockPrograms } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'
import { Student, Program } from '@/types/database'

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
  const [students, setStudents] = useState<Student[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setStudents(mockStudents)
      setPrograms(mockPrograms)
      setLoading(false)
      return
    }
    const [studentsRes, programsRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('programs').select('*').order('name'),
    ])
    setStudents(studentsRes.data || mockStudents)
    setPrograms(programsRes.data || mockPrograms)
    setLoading(false)
  }

  function getProgramName(id: string | null) {
    if (!id) return '—'
    return programs.find(p => p.id === id)?.name || '—'
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
    fetchData()
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
    fetchData()
  }

  const years = Array.from({ length: 10 }, (_, i) => currentYear + 1 - i)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">Manage freshmen student records</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Student
        </button>
      </div>

      {!isSupabaseConfigured && <ConfigNotice />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No students found. Add one to get started.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Age</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Enrolled Year</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Program</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Address</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{student.first_name} {student.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{student.age}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">{student.enrolled_year}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{getProgramName(student.program_id)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">{student.address}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(student)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="dela Cruz"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="18"
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrolled Year *</label>
                  <select
                    value={form.enrolled_year}
                    onChange={e => setForm(f => ({ ...f, enrolled_year: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="123 Main St, City, Province"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program / Course</label>
                <select
                  value={form.program_id}
                  onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select Program —</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
                  {editing ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
