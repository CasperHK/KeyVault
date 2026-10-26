import type { Staff } from "@/lib/inventory";
import { InventoryEditorDialog } from "./InventoryEditorDialog";

export function StaffDialog({ record, onClose }: { record?: Staff; onClose: () => void }) {
  return (
    <InventoryEditorDialog
      noun="staff member"
      resource="staff"
      recordId={record?.id}
      description="A new connection in your people directory. Staff records do not create login accounts."
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
          {input("name", "Full name *", { required: true, placeholder: "e.g. Alex Morgan" })}
          {input("email", "Work email *", {
            type: "email",
            required: true,
            placeholder: "alex@company.com",
            maxLength: 254,
          })}
          {input("department", "Department *", { required: true, placeholder: "e.g. Engineering" })}
          {input("job_title", "Job title", { placeholder: "e.g. Software Engineer" })}
        </>
      )}
    </InventoryEditorDialog>
  );
}
