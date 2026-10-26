import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system-trash'

export const Route = createFileRoute('/admin/_dashboard/system/trash')({
  component: Page,
})
