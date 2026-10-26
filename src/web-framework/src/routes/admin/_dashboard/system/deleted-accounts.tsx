import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system-deleted-accounts'

export const Route = createFileRoute('/admin/_dashboard/system/deleted-accounts')({
  component: Page,
})
