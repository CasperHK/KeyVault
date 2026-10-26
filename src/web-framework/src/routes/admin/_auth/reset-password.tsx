import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/reset-password'

export const Route = createFileRoute('/admin/_auth/reset-password')({
  component: Page,
})
