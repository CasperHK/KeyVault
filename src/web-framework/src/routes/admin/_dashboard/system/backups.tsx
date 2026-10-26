import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/backups'

export const Route = createFileRoute('/admin/_dashboard/system/backups')({
  component: Page,
})
