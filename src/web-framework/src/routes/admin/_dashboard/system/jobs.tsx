import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/jobs'

export const Route = createFileRoute('/admin/_dashboard/system/jobs')({
  component: Page,
})
