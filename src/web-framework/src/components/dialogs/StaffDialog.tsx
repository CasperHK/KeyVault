import { t, useLocale } from "@/lib/i18n";
import type { Staff } from "@/lib/inventory";
import { InventoryEditorDialog } from "./InventoryEditorDialog";

export function StaffDialog({ record, onClose }: { record?: Staff; onClose: () => void }) {
  useLocale();

  return (
    <InventoryEditorDialog
      noun="staff member"
      resource="staff"
      recordId={record?.id}
      description={t(
        "A new connection in your people directory. Staff records do not create login accounts."
      )}
      initialValues={{
        name: record?.name ?? "",
        email: record?.email ?? "",
        department: record?.department ?? "",
        job_title: record?.job_title ?? "",
      }}
      getPayload={(values) => values}
      onClose={onClose}
    >
      {({ input }) => (
        <>
          {input("name", t("Full name *"), { required: true, placeholder: t("e.g. Alex Morgan") })}
          {input("email", t("Work email *"), {
            type: "email",
            required: true,
            placeholder: "alex@company.com",
            maxLength: 254,
          })}
          {input("department", t("Department *"), {
            required: true,
            placeholder: t("e.g. Engineering"),
          })}
          {input("job_title", t("Job title"), { placeholder: t("e.g. Software Engineer") })}
        </>
      )}
    </InventoryEditorDialog>
  );
}
