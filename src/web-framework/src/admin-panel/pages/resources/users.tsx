import { ResourcePage } from "@admin/components/resource/resource-page";
import { usersResource } from "@admin/resources/users/users";

export default function UsersPage() {
  return <ResourcePage resource={usersResource} />;
}
