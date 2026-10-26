import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/account-security'

export const Route = createFileRoute('/admin/_dashboard/account/security')({
  component: Page,
})
