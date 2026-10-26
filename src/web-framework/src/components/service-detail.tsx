import { formatLocale, t, useLocale } from "@/lib/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowLeft, Cloud, Pencil, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, type Inventory, type Service, serviceHealth } from "@/lib/inventory";
import { Badge } from "./keyvault-ui";

export function ServiceDetail({
  service,
  data,
  onEdit,
}: {
  service: Service | undefined;
  data: Inventory;
  onEdit: (service: Service) => void;
}) {
  useLocale();

  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now);
  const check = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/inventory/services/${id}/check`);
    },
    onSuccess: async () => {
      setNow(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
  const { mutate, isPending } = check;
  const id = service?.id;
  const url = service?.health_url;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!id || !url || isPending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") mutate(id);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [id, url, isPending, mutate]);
  const back = (
    <Link to="/dashboard" search={{ view: "services" }} className="kv-text-link">
      <ArrowLeft size={15} /> {t("Back to hosted services")}
    </Link>
  );
  if (!service) {
    return (
      <section className="kv-card">
        <div className="kv-empty">
          <Cloud size={32} />
          <h2>{t("Service not found.")}</h2>
          <p>{t("This record may have been removed. Choose another service from the list.")}</p>
          {back}
        </div>
      </section>
    );
  }
  const host = data.assets.find((asset) => asset.id === service.host_id);
  const health = serviceHealth(service, now);
  return (
    <div className="kv-service-detail">
      {back}
      <section className="kv-card kv-service-panel">
        <div className="kv-card-heading">
          <div>
            <span className="kv-overline">{t("SERVICE DETAILS")}</span>
            <h2>{service.name}</h2>
            <p>{service.description || t("No description recorded.")}</p>
          </div>
          <button className="kv-button" onClick={() => onEdit(service)}>
            <Pencil size={15} /> {t("Edit service")}
          </button>
        </div>
        <dl className="kv-service-fields">
          <div>
            <dt>{t("Host device / server")}</dt>
            <dd>{host ? `${host.name} (${host.tag})` : t("Unknown host")}</dd>
          </div>
          <div>
            <dt>{t("Physical location")}</dt>
            <dd>{host?.location || t("Not recorded")}</dd>
          </div>
          <div>
            <dt>{t("Installation path on host")}</dt>
            <dd>
              <code>{service.installation_path || t("Not recorded")}</code>
            </dd>
          </div>
          <div>
            <dt>{t("Environment")}</dt>
            <dd>{t(service.environment)}</dd>
          </div>
          <div>
            <dt>{t("Recorded operational status")}</dt>
            <dd>
              <Badge status={service.status} />
            </dd>
          </div>
          <div>
            <dt>{t("Service port")}</dt>
            <dd>{service.port || t("Not recorded")}</dd>
          </div>
          <div>
            <dt>{t("Responsible staff")}</dt>
            <dd className="kv-responsible-links">
              {service.responsible_staff.length
                ? service.responsible_staff.map((person) => (
                    <Link
                      key={person.id}
                      to="/dashboard"
                      search={{ view: "staff", staff_id: person.id }}
                      className="kv-text-link"
                    >
                      {person.name}
                    </Link>
                  ))
                : t("Unassigned")}
            </dd>
          </div>
        </dl>
      </section>
      <section className="kv-card kv-service-panel">
        <div className="kv-card-heading">
          <div>
            <h2>
              <Activity size={18} /> {t("HTTP health")}
            </h2>
            <p>{t("Live availability checks, separate from the recorded operational status.")}</p>
          </div>
          <button
            className="kv-button primary"
            disabled={!service.health_url || isPending}
            onClick={() => mutate(service.id)}
          >
            <RefreshCw size={15} /> {isPending ? t("Checking...") : t("Check now")}
          </button>
        </div>
        {check.isError && (
          <p className="kv-error" role="alert">
            {errorMessage(check.error)}
          </p>
        )}
        <dl className="kv-service-fields" aria-live="polite">
          <div>
            <dt>{t("Current health")}</dt>
            <dd>
              <Badge status={health} />
            </dd>
          </div>
          <div>
            <dt>{t("Health endpoint")}</dt>
            <dd>
              <code>
                {service.health_url || t("Not configured. Edit this service to add a health URL.")}
              </code>
            </dd>
          </div>
          <div>
            <dt>{t("Last checked")}</dt>
            <dd>
              {service.checked_at
                ? new Date(service.checked_at).toLocaleString(formatLocale())
                : t("Never checked")}
            </dd>
          </div>
          <div>
            <dt>{t("Last HTTP status")}</dt>
            <dd>{service.http_status || t("No HTTP response")}</dd>
          </div>
          <div>
            <dt>{t("Last response time")}</dt>
            <dd>{service.checked_at ? `${service.response_time_ms} ms` : t("Not measured")}</dd>
          </div>
        </dl>
        <div className="kv-service-note">
          <h3>{t("Detected HTTP errors (latest check)")}</h3>
          <p>
            {(service.check_error ? t(service.check_error) : "") ||
              (service.checked_at
                ? t("No HTTP errors in the last check.")
                : t("No check has run yet; errors are unknown."))}
          </p>
          {health === "Unknown" && service.checked_at && (
            <p>
              {t(
                "Health is unknown because the result is stale (five minutes or older) or the check could not assess this endpoint."
              )}
            </p>
          )}
          <p>
            {t(
              "Checks run every minute only while this page is open and visible, or when you select Check now. HTTP 2xx is healthy; other responses, TLS, DNS and connection failures are not. Private and loopback targets are blocked by the HTTP safety policy."
            )}
          </p>
          <p>
            {t(
              "This is availability monitoring, not security-event collection or proof that a service is free from compromise. Installation paths are inventory records, not discovered by HTTP checks."
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
