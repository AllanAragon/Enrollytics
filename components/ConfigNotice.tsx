export default function ConfigNotice() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-yellow-800">Demo Mode - Supabase Not Configured</h3>
          <p className="text-sm text-yellow-700 mt-1">
            You are viewing demo data. To connect to a real database, copy{' '}
            <code className="bg-yellow-100 px-1 rounded">.env.local.example</code> to{' '}
            <code className="bg-yellow-100 px-1 rounded">.env.local</code> and add your Supabase credentials.
          </p>
        </div>
      </div>
    </div>
  )
}
