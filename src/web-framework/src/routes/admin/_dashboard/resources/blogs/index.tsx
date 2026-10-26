import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/resources/blogs'

export const Route = createFileRoute('/admin/_dashboard/resources/blogs/')({
  component: Page,
})
