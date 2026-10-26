import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/resources/users'

export const Route = createFileRoute('/admin/_dashboard/resources/users/')({
  component: Page,
})
