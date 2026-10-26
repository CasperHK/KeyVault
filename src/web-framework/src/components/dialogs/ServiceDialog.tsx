import { t, useLocale } from "@/lib/i18n";
import { useState } from "react";
import type { Inventory, Service } from "@/lib/inventory";
import { choices, InventoryEditorDialog } from "./InventoryEditorDialog";

export function ServiceDialog({
  record,
  data,
  onClose,
}: {
  record?: Service;
  data: Inventory;
  onClose: () => void;
}) {
  useLocale();

  const [responsibleStaffIDs, setResponsibleStaffIDs] = useState(
    () => record?.responsible_staff.map((person) => person.id) || []
  );
  return (
    <InventoryEditorDialog
      noun="service"
      resource="services"
      recordId={record?.id}
      description={t("Know exactly what runs where.")}
      initialValues={{
        name: record?.name ?? "",
        description: record?.description ?? "",
        host_id: record?.host_id == null ? "" : String(record.host_id),
        environment: record?.environment ?? "Production",
        status: record?.status ?? "Running",
        port: record?.port == null ? "" : String(record.port),
        installation_path: record?.installation_path ?? "",
        health_url: record?.health_url ?? "",
      }}
      getPayload={(values) => ({
        ...values,
        host_id: Number(values.host_id),
        port: Number(values.port || 0),
        responsible_staff_ids: responsibleStaffIDs,
      })}
      onClose={onClose}
    >
      {({ values, set, input, select }) => (
        <>
          {input("name", t("Name *"), { required: true, placeholder: t("e.g. Company intranet") })}
          {select("host_id", t("Host device / server *"), [
            { value: "", label: t("Select a host") },
            ...data.assets
              .filter((asset) => asset.status !== "Retired")
              .map((asset) => ({
                value: String(asset.id),
                label: `${asset.name} (${asset.tag})`,
              })),
          ])}
          {select(
            "environment",
            t("Environment *"),
            choices(["Production", "Staging", "Development"])
          )}
          {select("status", t("Status *"), choices(["Running", "Maintenance", "Stopped"]))}
          {input("port", t("Port (optional)"), { type: "number", placeholder: t("e.g. 443") })}
          {input("installation_path", t("Installation path (on host)"), {
            maxLength: 1000,
            placeholder: t("e.g. C:\\Services\\Intranet or /opt/intranet"),
          })}
          {input("health_url", t("HTTP health URL (optional)"), {
            type: "url",
            maxLength: 2000,
            placeholder: "https://service.example.com/health",
          })}
          <p className="kv-form-full">
            {t(
              "Use a read-only health endpoint. Checks accept HTTP 2xx as healthy and follow up to four redirects. Private, loopback and metadata targets are blocked. Do not include credentials or secrets in the URL."
            )}
          </p>
          <fieldset className="kv-form-full kv-responsibility-picker">
            <legend>{t("Responsible staff")}</legend>
            <p>
              {t(
                "Select everyone responsible for this service, regardless of who owns its host device."
              )}
            </p>
            {data.staff.length === 0 ? (
              <p>{t("Register staff in the directory to assign responsibility.")}</p>
            ) : (
              <div>
                {data.staff.map((person) => (
                  <label key={person.id}>
                    <input
                      type="checkbox"
                      checked={responsibleStaffIDs.includes(person.id)}
                      onChange={(event) =>
                        setResponsibleStaffIDs((previous) =>
                          event.target.checked
                            ? [...previous, person.id]
                            : previous.filter((id) => id !== person.id)
                        )
                      }
                    />
                    <span>
                      {person.name}
                      <small>{person.department}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <label className="kv-form-full">
            {t("Description")}
            <textarea
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>
          {data.assets.length === 0 && (
            <p className="kv-error kv-form-full">
              {t("Add a device or server before registering a service.")}
            </p>
          )}
        </>
      )}
    </InventoryEditorDialog>
  );
}
