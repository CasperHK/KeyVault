import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/magic-link'

export const Route = createFileRoute('/admin/_auth/magic-link')({
  component: Page,
})
