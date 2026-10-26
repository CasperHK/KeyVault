import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/ticket'

export const Route = createFileRoute('/admin/_dashboard/system/support/$id')({
  component: Page,
})
