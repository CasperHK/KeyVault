import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/files'

export const Route = createFileRoute('/admin/_dashboard/system/files')({
  component: Page,
})
