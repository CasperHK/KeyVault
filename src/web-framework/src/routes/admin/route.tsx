import { createFileRoute, Outlet } from '@tanstack/react-router'

import '@admin/admin.css'

export const Route = createFileRoute('/admin')({
  component: AdminSection,
})

function AdminSection() {
  return <Outlet />
}
