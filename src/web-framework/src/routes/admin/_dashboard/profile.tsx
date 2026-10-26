import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/profile'

export const Route = createFileRoute('/admin/_dashboard/profile')({
  component: Page,
})
