import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/callback'

export const Route = createFileRoute('/admin/_auth/callback')({
  component: Page,
})
