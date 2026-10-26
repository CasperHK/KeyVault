import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/observability'

export const Route = createFileRoute('/admin/_dashboard/system/observability')({
  component: Page,
})
