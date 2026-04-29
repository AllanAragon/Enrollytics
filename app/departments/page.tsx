'use client'

import { useState, useEffect } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockDepartments } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'
import { Department } from '@/types/database'

const emptyForm = { name: '', code: '', description: '' }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  async function fetchDepartments() {
    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setDepartments(mockDepartments)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setDepartments(mockDepartments)
    } else {
      setDepartments(data || [])
    }
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' })
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
        setDepartments(prev => prev.map(d => d.id === editing.id ? { ...d, ...form } : d))
      } else {
        const newDept: Department = {
          id: Date.now().toString(),
          ...form,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setDepartments(prev => [newDept, ...prev])
      }
      setShowModal(false)
      return
    }
    if (editing) {
      const { error } = await supabase.from('departments').update({ name: form.name, code: form.code, description: form.description }).eq('id', editing.id)
      if (error) { setError(error.message); return }
    } else {
      const { error } = await supabase.from('departments').insert([{ name: form.name, code: form.code, description: form.description }])
      if (error) { setError(error.message); return }
    }
    setShowModal(false)
    fetchDepartments()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this department?')) return
    const supabase = createClient()
    if (!supabase) {
      setDepartments(prev => prev.filter(d => d.id !== id))
      return
    }
    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) { alert(error.message); return }
    fetchDepartments()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Manage academic departments</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + Add Department
        </button>
      </div>

      {!isSupabaseConfigured && <ConfigNotice />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No departments found. Add one to get started.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Description</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map(dept => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{dept.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm font-medium">{dept.code}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{dept.description || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEdit(dept)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
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
              <h2 className="text-xl font-semibold text-gray-900">{editing ? 'Edit Department' : 'Add Department'}</h2>
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
                  placeholder="e.g. College of Computer Studies"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. CCS"
                />
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
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editing ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-medium"
                >
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
