import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { apiClient } from '@admin/lib/api-client'

export const Route = createFileRoute('/admin/_auth')({
  // Auth tokens live in HttpOnly cookies, so JS cannot read them — a
  // localStorage check here is always empty and would show the login form to
  // an already-signed-in user. Ask the API instead: /api/auth/me succeeds
  // when the cookie is valid and 401s when it isn't.
  beforeLoad: async () => {
    try {
      await apiClient.get('/api/auth/me')
    } catch {
      return // not signed in — show the auth screens
    }
    throw redirect({ to: '/admin/dashboard' })
  },
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Outlet />
    </div>
  ),
})
