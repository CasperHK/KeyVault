import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system'

export const Route = createFileRoute('/admin/_dashboard/system/')({
  component: Page,
})
