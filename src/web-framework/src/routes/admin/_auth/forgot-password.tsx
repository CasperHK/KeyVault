import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/forgot-password'

export const Route = createFileRoute('/admin/_auth/forgot-password')({
  component: Page,
})
