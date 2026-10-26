import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/health'

export const Route = createFileRoute('/admin/_dashboard/system/health')({
  component: Page,
})
