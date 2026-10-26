import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/dashboard'

export const Route = createFileRoute('/admin/_dashboard/dashboard')({
  component: Page,
})
