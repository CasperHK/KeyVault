import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/security'

export const Route = createFileRoute('/admin/_dashboard/system/security')({
  component: Page,
})
