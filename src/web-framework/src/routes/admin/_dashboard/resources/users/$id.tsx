import { createFileRoute } from '@tanstack/react-router'
import { ResourceDetailPage } from '@admin/components/resource/resource-detail-page'
import { usersResource } from '@admin/resources/users/users'

export const Route = createFileRoute('/admin/_dashboard/resources/users/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  return <ResourceDetailPage resource={usersResource} id={id} />
}
