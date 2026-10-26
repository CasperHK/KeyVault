import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/access-reviews'

export const Route = createFileRoute('/admin/_dashboard/system/access-reviews')({
  component: Page,
})
