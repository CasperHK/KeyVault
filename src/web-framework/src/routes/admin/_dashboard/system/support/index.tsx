import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/support'

export const Route = createFileRoute('/admin/_dashboard/system/support/')({
  component: Page,
})
