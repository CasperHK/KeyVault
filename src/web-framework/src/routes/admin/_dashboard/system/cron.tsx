import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/cron'

export const Route = createFileRoute('/admin/_dashboard/system/cron')({
  component: Page,
})
