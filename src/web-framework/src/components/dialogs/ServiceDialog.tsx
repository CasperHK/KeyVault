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
  const [responsibleStaffIDs, setResponsibleStaffIDs] = useState(
    () => record?.responsible_staff.map((person) => person.id) || []
  );
  return (
    <InventoryEditorDialog
      noun="service"
      resource="services"
      recordId={record?.id}
      description="Know exactly what runs where."
      initialValues={{
        name: record?.name ?? "",
        description: record?.description ?? "",
        host_id: record?.host_id == null ? "" : String(record.host_id),
        environment: record?.environment ?? "Production",
        status: record?.status ?? "Running",
        port: record?.port == null ? "" : String(record.port),
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
          {input("name", "Name *", { required: true, placeholder: "e.g. Company intranet" })}
          {select("host_id", "Host device / server *", [
            { value: "", label: "Select a host" },
            ...data.assets
              .filter((asset) => asset.status !== "Retired")
              .map((asset) => ({
                value: String(asset.id),
                label: `${asset.name} (${asset.tag})`,
              })),
          ])}
          {select(
            "environment",
            "Environment *",
            choices(["Production", "Staging", "Development"])
          )}
          {select("status", "Status *", choices(["Running", "Maintenance", "Stopped"]))}
          {input("port", "Port (optional)", { type: "number", placeholder: "e.g. 443" })}
          <fieldset className="kv-form-full kv-responsibility-picker">
            <legend>Responsible staff</legend>
            <p>
              Select everyone responsible for this service, regardless of who owns its host device.
            </p>
            {data.staff.length === 0 ? (
              <p>Register staff in the directory to assign responsibility.</p>
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
            Description
            <textarea
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>
          {data.assets.length === 0 && (
            <p className="kv-error kv-form-full">
              Add a device or server before registering a service.
            </p>
          )}
        </>
      )}
    </InventoryEditorDialog>
  );
}
