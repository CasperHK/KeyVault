import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/performance'

export const Route = createFileRoute('/admin/_dashboard/system/performance')({
  component: Page,
})
