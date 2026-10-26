import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/verify-email'

export const Route = createFileRoute('/admin/_auth/verify-email')({
  component: Page,
})
