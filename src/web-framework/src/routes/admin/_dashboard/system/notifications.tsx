import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/notifications'

export const Route = createFileRoute('/admin/_dashboard/system/notifications')({
  component: Page,
})
