import { createFileRoute } from '@tanstack/react-router'
import { ResourceDetailPage } from '@admin/components/resource/resource-detail-page'
import { blogsResource } from '@admin/resources/blogs/blogs'

export const Route = createFileRoute('/admin/_dashboard/resources/blogs/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  return <ResourceDetailPage resource={blogsResource} id={id} />
}
