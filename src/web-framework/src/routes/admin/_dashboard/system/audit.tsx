import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/audit'

export const Route = createFileRoute('/admin/_dashboard/system/audit')({
  component: Page,
})
