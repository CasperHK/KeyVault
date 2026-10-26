import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/sso'

export const Route = createFileRoute('/admin/_dashboard/system/sso')({
  component: Page,
})
