import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/system/mail'

export const Route = createFileRoute('/admin/_dashboard/system/mail')({
  component: Page,
})
