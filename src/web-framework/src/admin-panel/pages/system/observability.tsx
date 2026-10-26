import { useEffect } from "react";
import { useRouter } from "@admin/lib/next-compat";

// Merged into the operations page: everything this showed, and the latency,
// throughput and slow routes it never managed to.
export default function ObservabilityRedirect() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin/system/performance");
	}, [router]);

	return (
		<p className="p-8 text-sm text-text-secondary">
			Observability has moved to <a className="underline" href="/admin/system/performance">Operations</a>.
		</p>
	);
}
