import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/roles'

export const Route = createFileRoute('/admin/_dashboard/system/roles')({
  component: Page,
})
