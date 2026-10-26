import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system-account'

export const Route = createFileRoute('/admin/_dashboard/system/account')({
  component: Page,
})
