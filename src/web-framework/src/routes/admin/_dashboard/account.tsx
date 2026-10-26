import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/account'

export const Route = createFileRoute('/admin/_dashboard/account')({
  component: Page,
})
