import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/form-shares'

export const Route = createFileRoute('/admin/_dashboard/system/form-shares')({
  component: Page,
})
