'use client'

import { useState, useEffect } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockPrograms, mockDepartments } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'
import { Program, Department } from '@/types/database'

const emptyForm = { name: '', code: '', description: '', department_id: '' }

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>(isSupabaseConfigured ? [] : mockPrograms)
  const [departments, setDepartments] = useState<Department[]>(isSupabaseConfigured ? [] : mockDepartments)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

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
    return departments.find(d => d.id === id)?.name || '—'
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
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Program
        </button>
      </div>

      {!isSupabaseConfigured && <ConfigNotice />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : programs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No programs found. Add one to get started.</div>
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
              {programs.map(prog => (
                <tr key={prog.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{prog.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">{prog.code}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{getDeptName(prog.department_id)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{prog.description || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(prog)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(prog.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Bachelor of Science in Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. BSCS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select Department —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Optional description"
                />
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
