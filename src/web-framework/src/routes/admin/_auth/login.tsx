import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/login'

export const Route = createFileRoute('/admin/_auth/login')({
  component: Page,
})
