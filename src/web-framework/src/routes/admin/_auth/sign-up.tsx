import { createFileRoute } from '@tanstack/react-router'
import Page from '@admin/pages/sign-up'

export const Route = createFileRoute('/admin/_auth/sign-up')({
  component: Page,
})
