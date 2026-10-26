import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/settings/dashboard'

export const Route = createFileRoute('/admin/_dashboard/settings/dashboard')({
  component: Page,
})
