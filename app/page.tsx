import { isSupabaseConfigured } from '@/lib/supabase/client'
import { mockStudents, mockPrograms, mockDepartments } from '@/lib/mock-data'
import ConfigNotice from '@/components/ConfigNotice'

export default async function DashboardPage() {
  const configured = isSupabaseConfigured

  let studentCount = mockStudents.length
  let programCount = mockPrograms.length
  let departmentCount = mockDepartments.length

  if (configured) {
    // When Supabase is configured, counts would be fetched from DB
    // For now we show mock data as fallback
  }

  const currentYear = new Date().getFullYear()
  const enrolledThisYear = mockStudents.filter(s => s.enrolled_year === currentYear).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Welcome to Enrollytics — Freshmen Enrollment Analytics</p>
      </div>

      {!configured && <ConfigNotice />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Students"
          value={studentCount}
          icon="👨‍🎓"
          color="bg-blue-500"
        />
        <StatCard
          title="Programs"
          value={programCount}
          icon="📚"
          color="bg-green-500"
        />
        <StatCard
          title="Departments"
          value={departmentCount}
          icon="🏛️"
          color="bg-purple-500"
        />
        <StatCard
          title="Enrolled This Year"
          value={enrolledThisYear}
          icon="🎓"
          color="bg-orange-500"
        />
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink href="/students" label="Manage Students" description="Add, edit, or remove student records" icon="👨‍🎓" />
          <QuickLink href="/programs" label="Manage Programs" description="Configure academic programs" icon="📚" />
          <QuickLink href="/departments" label="Manage Departments" description="Set up department information" icon="🏛️" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickLink({ href, label, description, icon }: { href: string; label: string; description: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  )
}
