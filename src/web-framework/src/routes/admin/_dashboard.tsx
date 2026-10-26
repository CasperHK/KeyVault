import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AdminLayout } from '@admin/components/layout/admin-layout'
import { apiClient } from '@admin/lib/api-client'

export const Route = createFileRoute('/admin/_dashboard')({
  // Auth tokens live in HttpOnly cookies, so JS cannot read them. Reading
  // localStorage here always returned null, which bounced every signed-in
  // user straight back to /login and made the whole admin unreachable.
  // Ask the API instead — the cookie rides along on the request.
  beforeLoad: async () => {
    try {
      await apiClient.get('/api/auth/me')
    } catch {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
})
