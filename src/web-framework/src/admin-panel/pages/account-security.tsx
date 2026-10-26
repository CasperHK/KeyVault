import { useEffect } from "react";
import { Link } from "@admin/lib/next-compat";
import { useRouter } from "@admin/lib/next-compat";

export default function AccountSecurityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/account#security");
  }, [router]);

  return (
    <div className="p-6 text-sm text-text-secondary">
      This page moved.{" "}
      <Link href="/admin/account#security" className="text-accent underline">
        Open your account
      </Link>
      .
    </div>
  );
}
