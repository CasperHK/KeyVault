import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/inventory";
import { BaseDialog } from "./BaseDialog";

interface InputOptions {
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}

interface FormFields {
  values: Record<string, string>;
  set: (name: string, value: string) => void;
  input: (name: string, title: string, options?: InputOptions) => ReactNode;
  select: (
    name: string,
    title: string,
    choices: { value: string; label: string }[],
    required?: boolean
  ) => ReactNode;
}

export const choices = (items: string[]) => items.map((item) => ({ value: item, label: item }));

export function InventoryEditorDialog({
  noun,
  resource,
  recordId,
  description,
  initialValues,
  getPayload,
  updateValues,
  children,
  onClose,
}: {
  noun: string;
  resource: "assets" | "staff" | "services";
  recordId?: number;
  description: string;
  initialValues: Record<string, string>;
  getPayload: (values: Record<string, string>) => object;
  updateValues?: (values: Record<string, string>, name: string) => Record<string, string>;
  children: (fields: FormFields) => ReactNode;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(initialValues);
  const set = (name: string, value: string) =>
    setValues((previous) => {
      const next = { ...previous, [name]: value };
      return updateValues ? updateValues(next, name) : next;
    });
  const mutation = useMutation({
    mutationFn: async () => {
      const url = `/api/inventory/${resource}${recordId ? `/${recordId}` : ""}`;
      await api.request({
        url,
        method: recordId ? "PUT" : "POST",
        data: getPayload(values),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(
        recordId
          ? "Changes saved. Everything is up to date."
          : `${noun[0].toUpperCase()}${noun.slice(1)} added to your workspace.`
      );
    },
  });

  function input(name: string, title: string, options: InputOptions = {}) {
    return (
      <label>
        {title}
        <input
          name={name}
          value={values[name]}
          onChange={(event) => set(name, event.target.value)}
          type={options.type || "text"}
          required={options.required}
          placeholder={options.placeholder}
          maxLength={options.maxLength || 120}
          min={options.type === "number" ? 0 : undefined}
          max={options.type === "number" ? 65535 : undefined}
        />
      </label>
    );
  }

  function select(
    name: string,
    title: string,
    options: { value: string; label: string }[],
    required = true
  ) {
    return (
      <label>
        {title}
        <select
          name={name}
          value={values[name]}
          onChange={(event) => set(name, event.target.value)}
          required={required}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <BaseDialog
      title={`${recordId ? "Manage" : "Add"} ${noun}`}
      description={description}
      open={!mutation.isSuccess}
      dismissible={!mutation.isPending}
      onClose={onClose}
    >
      {(close) => (
        <form
          className="kv-editor"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="kv-form-grid">{children({ values, set, input, select })}</div>
          {mutation.isError && (
            <div className="kv-error" role="alert">
              {errorMessage(mutation.error)}
            </div>
          )}
          <div className="kv-modal-actions">
            <button
              type="button"
              className="kv-button"
              onClick={close}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button className="kv-button primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="kv-spin" /> : <Save size={16} />}
              {recordId ? "Save changes" : `Add ${noun}`}
            </button>
          </div>
        </form>
      )}
    </BaseDialog>
  );
}
