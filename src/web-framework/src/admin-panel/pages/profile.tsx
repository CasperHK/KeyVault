import { useEffect } from "react";
import { useRouter } from "@admin/lib/next-compat";

// Merged into /account. Kept as a redirect rather than deleted: this path was
// the user menu's target for years, it is where a USER lands after signing in,
// and it is in release notes and bookmarks.
export default function ProfileRedirect() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin/account");
	}, [router]);

	return (
		<p className="p-8 text-sm text-text-secondary">
			Moved to <a className="underline" href="/admin/account">your account</a>.
		</p>
	);
}
