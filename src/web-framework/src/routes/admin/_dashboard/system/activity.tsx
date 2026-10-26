import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/activity'

export const Route = createFileRoute('/admin/_dashboard/system/activity')({
  component: Page,
})
