import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin has nothing of its own to show: the panel starts at the dashboard.
export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/dashboard' })
  },
})
