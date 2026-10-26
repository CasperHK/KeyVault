import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/gdpr'

export const Route = createFileRoute('/admin/_dashboard/system/gdpr')({
  component: Page,
})
