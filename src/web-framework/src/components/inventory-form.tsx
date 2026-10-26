import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { errorMessage, type Asset, type Inventory, type Service, type Staff } from '@/lib/inventory'
import { Modal } from './keyvault-ui'

export type Editor = { kind: 'asset'; record?: Asset; defaultKind?: Asset['kind'] } | { kind: 'staff'; record?: Staff } | { kind: 'service'; record?: Service }

export function InventoryForm({ editor, data, onClose }: { editor: Editor; data: Inventory; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>(() => ({
    name: '', tag: '', kind: editor.kind === 'asset' ? editor.defaultKind || 'Laptop' : '',
    model: '', serial: '', status: editor.kind === 'service' ? 'Running' : 'Available',
    location: '', owner_id: '', purchase_date: '', warranty_date: '', notes: '',
    email: '', department: '', job_title: '', description: '', host_id: '', environment: 'Production', port: '',
    ...Object.fromEntries(Object.entries(editor.record || {}).map(([key, value]) => [key, value == null ? '' : String(value)])),
  }))
  const set = (name: string, value: string) => setValues(previous => {
    const next = { ...previous, [name]: value }
    if (name === 'owner_id' && value && previous.status === 'Available') next.status = 'In use'
    if (name === 'status' && ['Available', 'Retired'].includes(value)) next.owner_id = ''
    return next
  })
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = editor.kind === 'asset' ? {
        name: values.name, tag: values.tag, kind: values.kind, model: values.model, serial: values.serial,
        status: values.status, location: values.location, owner_id: values.owner_id ? Number(values.owner_id) : null,
        purchase_date: values.purchase_date, warranty_date: values.warranty_date, notes: values.notes,
      } : editor.kind === 'staff' ? {
        name: values.name, email: values.email, department: values.department, job_title: values.job_title,
      } : {
        name: values.name, description: values.description, host_id: Number(values.host_id),
        environment: values.environment, status: values.status, port: Number(values.port || 0),
      }
      const resource = editor.kind === 'asset' ? 'assets' : editor.kind === 'service' ? 'services' : 'staff'
      const url = `/api/inventory/${resource}${editor.record ? `/${editor.record.id}` : ''}`
      await api.request({ url, method: editor.record ? 'PUT' : 'POST', data: payload })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(editor.record ? 'Changes saved. Everything is up to date.' : `${editor.kind === 'staff' ? 'Staff member' : editor.kind === 'service' ? 'Service' : 'Asset'} added to your workspace.`)
      onClose()
    },
  })
  function input(name: string, title: string, options: { type?: string; required?: boolean; placeholder?: string; maxLength?: number } = {}) {
    return <label>{title}<input name={name} value={values[name]} onChange={event => set(name, event.target.value)} type={options.type || 'text'} required={options.required} placeholder={options.placeholder} maxLength={options.maxLength || 120} min={options.type === 'number' ? 0 : undefined} max={options.type === 'number' ? 65535 : undefined} /></label>
  }
  function select(name: string, title: string, choices: { value: string; label: string }[], required = true) {
    return <label>{title}<select name={name} value={values[name]} onChange={event => set(name, event.target.value)} required={required}>{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
  }
  const choices = (items: string[]) => items.map(item => ({ value: item, label: item }))
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate() }
  const noun = editor.kind === 'staff' ? 'staff member' : editor.kind
  return <Modal title={`${editor.record ? 'Manage' : 'Add'} ${noun}`} description={editor.kind === 'asset' ? 'The details that keep your inventory connected.' : editor.kind === 'staff' ? 'A new connection in your people directory. Staff records do not create login accounts.' : 'Know exactly what runs where.'} onClose={onClose}>
    <form className="kv-editor" onSubmit={submit}><div className="kv-form-grid">
      {input('name', editor.kind === 'staff' ? 'Full name *' : 'Name *', { required: true, placeholder: editor.kind === 'asset' ? 'e.g. MacBook Pro 14"' : editor.kind === 'staff' ? 'e.g. Alex Morgan' : 'e.g. Company intranet' })}
      {editor.kind === 'asset' && <>
        {input('tag', 'Asset tag *', { required: true, placeholder: 'e.g. KV-LT-011', maxLength: 60 })}
        {select('kind', 'Category *', choices(['Laptop', 'Desktop', 'Server', 'Mobile', 'Network']))}
        {select('status', 'Status *', choices(['Available', 'In use', 'Maintenance', 'Retired']))}
        {input('model', 'Model / specifications', { placeholder: 'e.g. Apple M3 / 16 GB' })}
        {input('serial', 'Serial number')}
        {input('location', 'Location *', { required: true, placeholder: 'e.g. Hong Kong HQ' })}
        {select('owner_id', 'Assigned to', [{ value: '', label: 'Unassigned' }, ...data.staff.map(person => ({ value: String(person.id), label: `${person.name} - ${person.department}` }))], false)}
        {input('purchase_date', 'Purchase date', { type: 'date' })}
        {input('warranty_date', 'Warranty expires', { type: 'date' })}
        <label className="kv-form-full">Notes<textarea value={values.notes} onChange={event => set('notes', event.target.value)} rows={3} maxLength={4000} placeholder="Anything worth knowing about this asset..." /></label>
        <p className="kv-form-hint kv-form-full">Assigning an available asset marks it as in use. Setting an asset to available or retired clears its owner. Every ownership change is recorded.</p>
      </>}
      {editor.kind === 'staff' && <>{input('email', 'Work email *', { type: 'email', required: true, placeholder: 'alex@company.com', maxLength: 254 })}{input('department', 'Department *', { required: true, placeholder: 'e.g. Engineering' })}{input('job_title', 'Job title', { placeholder: 'e.g. Software Engineer' })}</>}
      {editor.kind === 'service' && <>
        {select('host_id', 'Host device / server *', [{ value: '', label: 'Select a host' }, ...data.assets.filter(asset => asset.status !== 'Retired').map(asset => ({ value: String(asset.id), label: `${asset.name} (${asset.tag})` }))])}
        {select('environment', 'Environment *', choices(['Production', 'Staging', 'Development']))}
        {select('status', 'Status *', choices(['Running', 'Maintenance', 'Stopped']))}
        {input('port', 'Port (optional)', { type: 'number', placeholder: 'e.g. 443' })}
        <label className="kv-form-full">Description<textarea value={values.description} onChange={event => set('description', event.target.value)} rows={3} maxLength={2000} /></label>
        {data.assets.length === 0 && <p className="kv-error kv-form-full">Add a device or server before registering a service.</p>}
      </>}
    </div>{mutation.isError && <div className="kv-error" role="alert">{errorMessage(mutation.error)}</div>}<div className="kv-modal-actions"><button type="button" className="kv-button" onClick={onClose} disabled={mutation.isPending}>Cancel</button><button className="kv-button primary" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 size={16} className="kv-spin" /> : <Save size={16} />}{editor.record ? 'Save changes' : `Add ${noun}`}</button></div></form>
  </Modal>
}
