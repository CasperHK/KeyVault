import { t, useLocale } from "@/lib/i18n";
import type { Asset, Staff } from "@/lib/inventory";
import { choices, InventoryEditorDialog } from "./InventoryEditorDialog";

export function AssetDialog({
  record,
  defaultKind = "Laptop",
  staff,
  onClose,
}: {
  record?: Asset;
  defaultKind?: Asset["kind"];
  staff: Staff[];
  onClose: () => void;
}) {
  useLocale();

  return (
    <InventoryEditorDialog
      noun="asset"
      resource="assets"
      recordId={record?.id}
      description={t("The details that keep your inventory connected.")}
      initialValues={{
        name: record?.name ?? "",
        tag: record?.tag ?? "",
        kind: record?.kind ?? defaultKind,
        model: record?.model ?? "",
        serial: record?.serial ?? "",
        status: record?.status ?? "Available",
        location: record?.location ?? "",
        owner_id: record?.owner_id == null ? "" : String(record.owner_id),
        purchase_date: record?.purchase_date ?? "",
        warranty_date: record?.warranty_date ?? "",
        notes: record?.notes ?? "",
      }}
      updateValues={(values, name) => {
        if (name === "owner_id" && values.owner_id && values.status === "Available")
          values.status = "In use";
        if (name === "status" && ["Available", "Retired"].includes(values.status))
          values.owner_id = "";
        return values;
      }}
      getPayload={(values) => ({
        ...values,
        owner_id: values.owner_id ? Number(values.owner_id) : null,
      })}
      onClose={onClose}
    >
      {({ values, set, input, select }) => (
        <>
          {input("name", t("Name *"), { required: true, placeholder: t('e.g. MacBook Pro 14"') })}
          {input("tag", t("Asset tag *"), {
            required: true,
            placeholder: t("e.g. KV-LT-011"),
            maxLength: 60,
          })}
          {select(
            "kind",
            t("Category *"),
            choices(["Laptop", "Desktop", "Server", "Mobile", "Network"])
          )}
          {select(
            "status",
            t("Status *"),
            choices(["Available", "In use", "Maintenance", "Retired"])
          )}
          {input("model", t("Model / specifications"), { placeholder: t("e.g. Apple M3 / 16 GB") })}
          {input("serial", t("Serial number"))}
          {input("location", t("Location *"), {
            required: true,
            placeholder: t("e.g. Hong Kong HQ"),
          })}
          {select(
            "owner_id",
            t("Assigned to"),
            [
              { value: "", label: t("Unassigned") },
              ...staff.map((person) => ({
                value: String(person.id),
                label: `${person.name} - ${person.department}`,
              })),
            ],
            false
          )}
          {input("purchase_date", t("Purchase date"), { type: "date" })}
          {input("warranty_date", t("Warranty expires"), { type: "date" })}
          <label className="kv-form-full">
            {t("Notes")}
            <textarea
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={t("Anything worth knowing about this asset...")}
            />
          </label>
          <p className="kv-form-hint kv-form-full">
            {t(
              "Assigning an available asset marks it as in use. Setting an asset to available or retired clears its owner. Every ownership change is recorded."
            )}
          </p>
        </>
      )}
    </InventoryEditorDialog>
  );
}
