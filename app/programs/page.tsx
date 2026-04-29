'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockPrograms, mockDepartments } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'
import { Program, Department } from '@/types/database'
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon } from '@/components/Icons'

const emptyForm = { name: '', code: '', description: '', department_id: '' }

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>(isSupabaseConfigured ? [] : mockPrograms)
  const [departments, setDepartments] = useState<Department[]>(isSupabaseConfigured ? [] : mockDepartments)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  
  // Filter states
  const [searchText, setSearchText] = useState<string>('')
  const [filterDepartment, setFilterDepartment] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setPrograms(mockPrograms)
      setDepartments(mockDepartments)
      setLoading(false)
      return
    }
    const [programsRes, deptsRes] = await Promise.all([
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ])
    setPrograms(programsRes.data || mockPrograms)
    setDepartments(deptsRes.data || mockDepartments)
    setLoading(false)
  }

  function getDeptName(id: string | null) {
    if (!id) return '—'
    return departments.find(d => d.id === id)?.code || '—'
  }

  function getDeptFullName(id: string | null) {
    if (!id) return '—'
    return departments.find(d => d.id === id)?.name || '—'
  }

  // Filtered programs based on search text and department filter
  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      // Filter by department
      if (filterDepartment && program.department_id !== filterDepartment) {
        return false
      }
      
      // Filter by search text (search in name, code, and description)
      if (searchText) {
        const search = searchText.toLowerCase()
        const matchesName = program.name.toLowerCase().includes(search)
        const matchesCode = program.code.toLowerCase().includes(search)
        const matchesDescription = program.description?.toLowerCase().includes(search) || false
        
        if (!matchesName && !matchesCode && !matchesDescription) {
          return false
        }
      }
      
      return true
    })
  }, [programs, searchText, filterDepartment])

  // Clear all filters
  function clearFilters() {
    setSearchText('')
    setFilterDepartment('')
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(prog: Program) {
    setEditing(prog)
    setForm({ name: prog.name, code: prog.code, description: prog.description || '', department_id: prog.department_id || '' })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and Code are required.')
      return
    }
    const supabase = createClient()
    if (!supabase) {
      if (editing) {
        setPrograms(prev => prev.map(p => p.id === editing.id ? { ...p, ...form, department_id: form.department_id || null } : p))
      } else {
        const newProg: Program = {
          id: Date.now().toString(),
          ...form,
          department_id: form.department_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setPrograms(prev => [newProg, ...prev])
      }
      setShowModal(false)
      return
    }
    const payload = { name: form.name, code: form.code, description: form.description, department_id: form.department_id || null }
    if (editing) {
      const { error } = await supabase.from('programs').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); return }
    } else {
      const { error } = await supabase.from('programs').insert([payload])
      if (error) { setError(error.message); return }
    }
    setShowModal(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this program?')) return
    const supabase = createClient()
    if (!supabase) {
      setPrograms(prev => prev.filter(p => p.id !== id))
      return
    }
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) { alert(error.message); return }
    fetchData()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
          <p className="text-gray-500 mt-1">Manage academic programs</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Program
        </button>
      </div>

      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter Programs</h3>
          {(searchText || filterDepartment) && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <XIcon className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by name, code, or description..."
              className="w-full border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Showing {filteredPrograms.length} of {programs.length} programs</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {programs.length === 0 ? 'No programs found. Add one to get started.' : 'No programs match the selected filters.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Description</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPrograms.map(prog => (
                <tr key={prog.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{prog.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">{prog.code}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{getDeptName(prog.department_id)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{prog.description || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(prog)} className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(prog.id)} className="inline-flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editing ? 'Edit Program' : 'Add Program'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  placeholder="e.g. Bachelor of Science in Computer Science"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  placeholder="e.g. BSCS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Department</label>
                <select
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                >
                  <option value="">— Select Department —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-gray-400"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2">
                  {editing ? <><CheckIcon className="w-5 h-5" /> Update Program</> : <><PlusIcon className="w-5 h-5" /> Add Program</>}
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
    </div>
  )
}
