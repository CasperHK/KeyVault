import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/api-keys'

export const Route = createFileRoute('/admin/_dashboard/system/api-keys')({
  component: Page,
})
