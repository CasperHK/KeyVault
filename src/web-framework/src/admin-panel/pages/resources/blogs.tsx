import { ResourcePage } from "@admin/components/resource/resource-page";
import { blogsResource } from "@admin/resources/blogs/blogs";

export default function BlogsPage() {
  return <ResourcePage resource={blogsResource} />;
}
