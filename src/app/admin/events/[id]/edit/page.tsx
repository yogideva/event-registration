'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Save, Plus, Trash2, Upload, ChevronUp, ChevronDown, Globe, Copy,
  CheckCircle, XCircle, Settings, Ticket, AlignLeft, Image, FileText,
  Eye, EyeOff, X, Loader2, ExternalLink, ArrowLeft, Calendar, Clock,
  MapPin, AlertTriangle, RefreshCw, Send, Check
} from 'lucide-react'
import { formatDate } from '../../../utils'

const TABS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'media', label: 'Media' },
  { key: 'sections', label: 'Custom Content' },
  { key: 'tickets', label: 'Tickets & Pricing' },
  { key: 'fields', label: 'Form Builder' },
  { key: 'payment', label: 'Payment Config' },
  { key: 'reschedule', label: 'Reschedule & Cancellation' },
  { key: 'publish', label: 'Publish & Share' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'image_upload', label: 'Image Upload' },
  { value: 'url', label: 'URL' },
  { value: 'address', label: 'Address' },
]

const SUGGESTED_SECTIONS = [
  'About the Event', 'Agenda & Schedule', 'Speakers & Instructors',
  'Highlights', 'Important Instructions', 'What to Bring', 'FAQs', 'Contact Support'
]

const SUGGESTED_FIELDS = [
  { label: 'Full Name', type: 'text', req: true, ph: 'Full Name' },
  { label: 'WhatsApp / Mobile Number', type: 'phone', req: true, ph: '+91 9876543210' },
  { label: 'Email Address', type: 'email', req: true, ph: 'name@example.com' },
  { label: 'Gender', type: 'dropdown', req: false, opts: ['Male', 'Female', 'Non-Binary', 'Other'] },
  { label: 'Age', type: 'number', req: false, ph: '25' },
  { label: 'City', type: 'text', req: false, ph: 'City name' },
  { label: 'Company / Organization', type: 'text', req: false, ph: 'Company or Institution' },
  { label: 'Food Preference', type: 'dropdown', req: false, opts: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Other'] },
  { label: 'Upload ID Proof', type: 'file_upload', req: true, ph: 'Aadhaar / ID Card' },
]

const SUGGESTED_TICKETS = [
  { name: 'Early Bird', price: 999, desc: 'Special discounted pass for early attendees', color: '#10b981' },
  { name: 'Regular Entry', price: 1499, desc: 'Standard access pass for the event', color: '#6366f1' },
  { name: 'VIP Pass', price: 2999, desc: 'Front-row seating, networking lunch & kit', color: '#f59e0b' },
  { name: 'Student Pass', price: 499, desc: 'Discounted admission for students', color: '#0ea5e9' },
  { name: 'Free Registration', price: 0, desc: 'Complimentary admission pass', color: '#6b7280' },
]

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2"><X size={14} /></button>
    </div>
  )
}

function ImageUpload({ label, value, onChange, folder }: { label: string; value: string; onChange: (url: string) => void; folder: string }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, filename: file.name, folder })
      })
      const data = await res.json()
      if (data.url) onChange(data.url)
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-32 w-auto rounded-lg border border-gray-200 object-cover" />
          <button onClick={() => onChange('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={loading}
          className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm w-full justify-center">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Uploading...' : `Upload ${label}`}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

export default function EventEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  const [tab, setTab] = useState('basic')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [eventId, setEventId] = useState(isNew ? '' : id)

  // Basic info state
  const [form, setForm] = useState({
    name: '', category_id: '', description: '', about: '', date: '', start_time: '', end_time: '',
    venue_name: '', venue_address: '', maps_link: '',
    organizer_name: '', organizer_phone: '', organizer_email: '',
    registration_start: '', registration_end: '', max_participants: '',
    is_free: false, base_fee: '', currency: 'INR',
    terms: '', refund_policy: '', status: 'draft',
    poster: '', banner: '', logo: '', organizer_logo: '', slug: '',
    cancellation_reason: ''
  })

  const [categories, setCategories] = useState<any[]>([])
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', color: '#6366f1' })

  // Sections
  const [sections, setSections] = useState<any[]>([])
  const [editingSection, setEditingSection] = useState<any>(null)

  // Tickets
  const [tickets, setTickets] = useState<any[]>([])
  const [editingTicket, setEditingTicket] = useState<any>(null)

  // Fields
  const [fields, setFields] = useState<any[]>([])
  const [editingField, setEditingField] = useState<any>(null)

  // Payment settings
  const [paySettings, setPaySettings] = useState({ upi_id: '', upi_qr_image: '', payment_instructions: '' })

  // Reschedule & Cancellation
  const [reschedules, setReschedules] = useState<any[]>([])
  const [rescheduleForm, setRescheduleForm] = useState({ new_date: '', new_start_time: '', new_venue: '', reason: '' })
  const [rescheduling, setRescheduling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReasonInput, setCancelReasonInput] = useState('')

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
  }

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/events/${id}`).then(r => r.json()).then(ev => {
        if (ev.error) return
        setForm({
          name: ev.name || '', category_id: ev.category_id || '', description: ev.description || '', about: ev.about || '',
          date: ev.date || '', start_time: ev.start_time || '', end_time: ev.end_time || '',
          venue_name: ev.venue_name || '', venue_address: ev.venue_address || '', maps_link: ev.maps_link || '',
          organizer_name: ev.organizer_name || '', organizer_phone: ev.organizer_phone || '', organizer_email: ev.organizer_email || '',
          registration_start: ev.registration_start || '', registration_end: ev.registration_end || '',
          max_participants: ev.max_participants || '', is_free: !!ev.is_free, base_fee: ev.base_fee || '',
          currency: ev.currency || 'INR', terms: ev.terms || '', refund_policy: ev.refund_policy || '',
          status: ev.status || 'draft', poster: ev.poster || '', banner: ev.banner || '',
          logo: ev.logo || '', organizer_logo: ev.organizer_logo || '', slug: ev.slug || '',
          cancellation_reason: ev.cancellation_reason || ''
        })
        setSections(ev.sections || [])
        setTickets(ev.ticketTypes || [])
        setFields(ev.customFields || [])
        setReschedules(ev.reschedules || [])
        setRescheduleForm({
          new_date: ev.date || '',
          new_start_time: ev.start_time || '',
          new_venue: ev.venue_name || '',
          reason: ''
        })
      })
      fetch('/api/settings').then(r => r.json()).then(s => {
        setPaySettings({ upi_id: s.upi_id || '', upi_qr_image: s.upi_qr_image || '', payment_instructions: s.payment_instructions || '' })
      })
    }
  }, [id, isNew])

  async function saveBasic() {
    setSaving(true)
    const body = { ...form, max_participants: form.max_participants ? Number(form.max_participants) : null, base_fee: Number(form.base_fee) || 0 }
    let res, data
    if (isNew || !eventId) {
      res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      data = await res.json()
      if (data.id) {
        setEventId(data.id)
        setForm(f => ({ ...f, slug: data.slug }))
        showToast('Event created! You can now customize media, content, tickets, and fields.')
        router.push(`/admin/events/${data.id}/edit`)
      } else showToast(data.error || 'Error creating event', 'error')
    } else {
      res = await fetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      data = await res.json()
      if (!data.error) showToast('Event saved successfully!')
      else showToast(data.error, 'error')
    }
    setSaving(false)
  }

  async function saveMedia() {
    setSaving(true)
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, max_participants: form.max_participants ? Number(form.max_participants) : null, base_fee: Number(form.base_fee) || 0 })
    })
    const data = await res.json()
    if (!data.error) showToast('Media saved!')
    else showToast(data.error, 'error')
    setSaving(false)
  }

  async function addCategory() {
    if (!newCat.name) return
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) })
    const data = await res.json()
    setCategories(Array.isArray(data) ? data : categories)
    setNewCat({ name: '', color: '#6366f1' })
    setShowAddCat(false)
    showToast('Custom category created!')
  }

  async function deleteCategory(catId: string) {
    if (!confirm('Delete this category?')) return
    await fetch(`/api/categories/${catId}`, { method: 'DELETE' })
    setCategories(categories.filter(c => c.id !== catId))
    if (form.category_id === catId) setForm(f => ({ ...f, category_id: '' }))
  }

  // Sections
  async function addSection(title = 'New Section') {
    const res = await fetch(`/api/events/${eventId}/sections`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: '', type: 'text' })
    })
    const data = await res.json()
    setSections(Array.isArray(data) ? data : sections)
  }

  async function updateSection(s: any) {
    const res = await fetch(`/api/events/${eventId}/sections`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s)
    })
    const data = await res.json()
    setSections(Array.isArray(data) ? data : sections)
    setEditingSection(null)
    showToast('Section saved!')
  }

  async function deleteSection(sId: string) {
    if (!confirm('Delete section?')) return
    await fetch(`/api/events/${eventId}/sections/${sId}`, { method: 'DELETE' })
    setSections(sections.filter(s => s.id !== sId))
  }

  async function moveSectionOrder(idx: number, dir: 'up' | 'down') {
    const arr = [...sections]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setSections(arr)
    await fetch(`/api/events/${eventId}/sections`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) })
  }

  // Tickets
  async function addTicket(ticketPreset?: any) {
    const body = ticketPreset ? {
      name: ticketPreset.name,
      price: ticketPreset.price,
      description: ticketPreset.desc || '',
      color: ticketPreset.color || '#6366f1'
    } : { name: 'General', price: 0, description: '' }

    const res = await fetch(`/api/events/${eventId}/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    setTickets(Array.isArray(data) ? data : tickets)
    showToast(`Added ticket: ${body.name}`)
  }

  async function updateTicket(t: any) {
    const res = await fetch(`/api/events/${eventId}/tickets`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t)
    })
    const data = await res.json()
    setTickets(Array.isArray(data) ? data : tickets)
    setEditingTicket(null)
    showToast('Ticket updated!')
  }

  async function deleteTicket(tId: string) {
    if (!confirm('Delete ticket type?')) return
    await fetch(`/api/events/${eventId}/tickets/${tId}`, { method: 'DELETE' })
    setTickets(tickets.filter(t => t.id !== tId))
  }

  // Fields
  async function addField(preset?: any) {
    const body = preset ? {
      field_label: preset.label,
      field_type: preset.type,
      is_required: preset.req,
      placeholder: preset.ph || '',
      options: preset.opts || []
    } : { field_label: 'New Field', field_type: 'text', is_required: false }

    const res = await fetch(`/api/events/${eventId}/fields`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    setFields(Array.isArray(data) ? data : fields)
    showToast(`Added field: ${body.field_label}`)
  }

  async function updateField(f: any) {
    const res = await fetch(`/api/events/${eventId}/fields`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, options: f.options_str ? f.options_str.split('\n').filter(Boolean) : (f.options || []) })
    })
    const data = await res.json()
    setFields(Array.isArray(data) ? data : fields)
    setEditingField(null)
    showToast('Field saved!')
  }

  async function deleteField(fId: string) {
    if (!confirm('Delete field?')) return
    await fetch(`/api/events/${eventId}/fields/${fId}`, { method: 'DELETE' })
    setFields(fields.filter(f => f.id !== fId))
  }

  async function moveFieldOrder(idx: number, dir: 'up' | 'down') {
    const arr = [...fields]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setFields(arr)
    await fetch(`/api/events/${eventId}/fields`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) })
  }

  async function savePayment() {
    setSaving(true)
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paySettings) })
    const data = await res.json()
    if (data.ok) showToast('Payment settings saved!')
    else showToast('Error saving payment settings', 'error')
    setSaving(false)
  }

  async function changeStatus(newStatus: string, reason?: string) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        status: newStatus,
        cancellation_reason: reason || form.cancellation_reason,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        base_fee: Number(form.base_fee) || 0
      })
    })
    const data = await res.json()
    if (!data.error) {
      setForm(f => ({ ...f, status: newStatus, cancellation_reason: reason || f.cancellation_reason }))
      showToast(`Event status updated to ${newStatus}!`)
    }
  }

  async function handleRescheduleSubmit() {
    if (!rescheduleForm.new_date) {
      showToast('Please select a new event date', 'error')
      return
    }
    setRescheduling(true)
    const res = await fetch(`/api/events/${eventId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rescheduleForm)
    })
    const data = await res.json()
    setRescheduling(false)
    if (data.ok) {
      setReschedules(data.history || [])
      setForm(f => ({
        ...f,
        date: rescheduleForm.new_date,
        start_time: rescheduleForm.new_start_time || f.start_time,
        venue_name: rescheduleForm.new_venue || f.venue_name
      }))
      showToast(`Event rescheduled successfully! ${data.notifiedCount || 0} attendees notified.`)
    } else {
      showToast(data.error || 'Failed to reschedule event', 'error')
    }
  }

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/${form.slug}` : `/event/${form.slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`
  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const label = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/events')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Create Event' : 'Edit Event'}</h1>
            {!isNew && form.slug && (
              <a href={publicUrl} target="_blank" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                <ExternalLink size={11} /> {publicUrl}
              </a>
            )}
          </div>
        </div>
        {!isNew && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${form.status === 'published' ? 'bg-green-100 text-green-700' : form.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
            {form.status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Basic Info */}
      {tab === 'basic' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className={label}>Event Name <span className="text-red-500">*</span></label>
            <input className={inp} placeholder="Enter ANY custom event name (e.g. Annual Tech Symposium 2026, Yoga by the Lake)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Never restricted to predefined names. Type any event name you wish.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={label}>Event Category</label>
              <button onClick={() => setShowAddCat(!showAddCat)} className="text-xs text-indigo-600 font-semibold hover:underline">
                + Add Custom Category
              </button>
            </div>
            <select className={inp} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">— Select Category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {showAddCat && (
              <div className="mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-200 flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">New Category Name</label>
                  <input className={inp} placeholder="e.g. Meditation Camp, Music Festival, Hackathon" value={newCat.name} onChange={e => setNewCat(n => ({ ...n, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Color Tag</label>
                  <input type="color" value={newCat.color} onChange={e => setNewCat(n => ({ ...n, color: e.target.value }))} className="h-9 w-16 border border-gray-300 rounded-lg cursor-pointer" />
                </div>
                <button onClick={addCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add Category</button>
                <button onClick={() => setShowAddCat(false)} className="px-3 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              </div>
            )}

            {categories.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1.5 font-medium">Available Categories (Click to select, delete with ×):</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(c => (
                    <span key={c.id} onClick={() => setForm(f => ({ ...f, category_id: c.id }))}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer border transition-all ${form.category_id === c.id ? 'ring-2 ring-indigo-500 font-bold' : ''}`}
                      style={{ background: c.color + '15', color: c.color, borderColor: c.color + '40' }}>
                      {c.name}
                      <button onClick={(e) => { e.stopPropagation(); deleteCategory(c.id) }} className="hover:opacity-75 text-gray-500"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={label}>Short Description</label>
            <textarea className={inp} rows={2} placeholder="Brief one-line summary for event cards and previews..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div>
            <label className={label}>About the Event (Detailed Overview)</label>
            <textarea className={inp} rows={4} placeholder="Full background, objective, and description of the event..." value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Event Date</label>
              <input type="date" className={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Start Time</label>
              <input type="time" className={inp} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className={label}>End Time</label>
              <input type="time" className={inp} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Venue Name</label>
              <input className={inp} placeholder="e.g. Grand Auditorium, Convention Center" value={form.venue_name} onChange={e => setForm(f => ({ ...f, venue_name: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Google Maps Link</label>
              <input className={inp} placeholder="https://maps.google.com/..." value={form.maps_link} onChange={e => setForm(f => ({ ...f, maps_link: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={label}>Venue Address</label>
            <input className={inp} placeholder="Street address, Landmark, City, Pincode" value={form.venue_address} onChange={e => setForm(f => ({ ...f, venue_address: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Organizer Name</label>
              <input className={inp} value={form.organizer_name} onChange={e => setForm(f => ({ ...f, organizer_name: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Organizer Phone</label>
              <input className={inp} value={form.organizer_phone} onChange={e => setForm(f => ({ ...f, organizer_phone: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Organizer Email</label>
              <input type="email" className={inp} value={form.organizer_email} onChange={e => setForm(f => ({ ...f, organizer_email: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Registration Start Date</label>
              <input type="date" className={inp} value={form.registration_start} onChange={e => setForm(f => ({ ...f, registration_start: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Registration Closing Date</label>
              <input type="date" className={inp} value={form.registration_end} onChange={e => setForm(f => ({ ...f, registration_end: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Maximum Participants</label>
              <input type="number" min="1" className={inp} placeholder="Leave blank for unlimited" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Currency</label>
              <select className={inp} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div>
              <label className={label}>Registration Fee (Default / Base)</label>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => setForm(f => ({ ...f, is_free: !f.is_free }))}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${form.is_free ? 'bg-green-100 border-green-400 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                  {form.is_free ? 'FREE' : 'Paid'}
                </button>
                {!form.is_free && (
                  <input type="number" min="0" step="0.01" className={inp} placeholder="0.00" value={form.base_fee} onChange={e => setForm(f => ({ ...f, base_fee: e.target.value }))} />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Terms & Conditions</label>
            <textarea className={inp} rows={3} placeholder="Attendee guidelines, conduct, entry rules..." value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
          </div>

          <div>
            <label className={label}>Cancellation / Refund Policy</label>
            <textarea className={inp} rows={3} placeholder="Refund eligibility, timelines, cancellation charges..." value={form.refund_policy} onChange={e => setForm(f => ({ ...f, refund_policy: e.target.value }))} />
          </div>

          <button onClick={saveBasic} disabled={saving || !form.name}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isNew ? 'Create Event & Continue' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* TAB: Media */}
      {tab === 'media' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first to upload media.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUpload label="Event Poster (Display Card & Ticket)" value={form.poster} onChange={url => setForm(f => ({ ...f, poster: url }))} folder="poster" />
            <ImageUpload label="Event Banner (Hero Header)" value={form.banner} onChange={url => setForm(f => ({ ...f, banner: url }))} folder="banner" />
            <ImageUpload label="Event Logo" value={form.logo} onChange={url => setForm(f => ({ ...f, logo: url }))} folder="logo" />
            <ImageUpload label="Organizer Logo" value={form.organizer_logo} onChange={url => setForm(f => ({ ...f, organizer_logo: url }))} folder="organizer-logo" />
          </div>
          <button onClick={saveMedia} disabled={saving || !eventId}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Media
          </button>
        </div>
      )}

      {/* TAB: Sections */}
      {tab === 'sections' && (
        <div className="space-y-5">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first.</p>}

          {/* Suggested Preset Sections (UX Principle 18) */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">Suggested Sections (Click to quick-add):</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SECTIONS.map(s => (
                <button key={s} onClick={() => addSection(s)} disabled={!eventId}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {sections.map((s, i) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {editingSection?.id === s.id ? (
                <div className="space-y-3">
                  <input className={inp} value={editingSection.title} onChange={e => setEditingSection((es: any) => ({ ...es, title: e.target.value }))} placeholder="Section title" />
                  <select className={inp} value={editingSection.type} onChange={e => setEditingSection((es: any) => ({ ...es, type: e.target.value }))}>
                    <option value="text">Text Content</option>
                    <option value="image">Image Section</option>
                    <option value="video">Video Embed (YouTube/Vimeo)</option>
                    <option value="document">Supporting Document / PDF</option>
                  </select>
                  <textarea className={inp} rows={4} value={editingSection.content} onChange={e => setEditingSection((es: any) => ({ ...es, content: e.target.value }))} placeholder="Content text, schedule, bio, instructions..." />
                  {editingSection.type === 'image' && <input className={inp} value={editingSection.image_url} onChange={e => setEditingSection((es: any) => ({ ...es, image_url: e.target.value }))} placeholder="Image URL (or upload in media tab)" />}
                  {editingSection.type === 'video' && <input className={inp} value={editingSection.video_url} onChange={e => setEditingSection((es: any) => ({ ...es, video_url: e.target.value }))} placeholder="YouTube / Video URL" />}
                  <div className="flex gap-2">
                    <button onClick={() => updateSection(editingSection)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"><Save size={14} />Save Section</button>
                    <button onClick={() => setEditingSection(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{s.title}</p>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">{s.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{s.content ? `${s.content.substring(0, 100)}...` : '(No content entered yet)'}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => moveSectionOrder(i, 'up')} disabled={i === 0} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => moveSectionOrder(i, 'down')} disabled={i === sections.length - 1} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={15} /></button>
                    <button onClick={() => setEditingSection({ ...s })} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded"><FileText size={15} /></button>
                    <button onClick={() => deleteSection(s.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => addSection('Custom Section')} disabled={!eventId}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">
            <Plus size={16} /> + Add Custom Section
          </button>
        </div>
      )}

      {/* TAB: Tickets */}
      {tab === 'tickets' && (
        <div className="space-y-5">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first.</p>}

          {/* Suggested Ticket Types Preset (UX Principle 18) */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">Suggested Ticket Presets (Click to quick-add):</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TICKETS.map(tp => (
                <button key={tp.name} onClick={() => addTicket(tp)} disabled={!eventId}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  + {tp.name} ({tp.price === 0 ? 'FREE' : `₹${tp.price}`})
                </button>
              ))}
            </div>
          </div>

          {tickets.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {editingTicket?.id === t.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className={label}>Ticket Name</label><input className={inp} value={editingTicket.name} onChange={e => setEditingTicket((et: any) => ({ ...et, name: e.target.value }))} /></div>
                  <div><label className={label}>Price (₹)</label><input type="number" min="0" className={inp} value={editingTicket.price} onChange={e => setEditingTicket((et: any) => ({ ...et, price: e.target.value }))} /></div>
                  <div><label className={label}>Capacity (Seats)</label><input type="number" min="1" className={inp} placeholder="Unlimited" value={editingTicket.capacity || ''} onChange={e => setEditingTicket((et: any) => ({ ...et, capacity: e.target.value }))} /></div>
                  <div><label className={label}>Color Tag</label><input type="color" className="h-9 w-full border border-gray-300 rounded-lg cursor-pointer" value={editingTicket.color || '#6366f1'} onChange={e => setEditingTicket((et: any) => ({ ...et, color: e.target.value }))} /></div>
                  <div><label className={label}>Registration Opens</label><input type="date" className={inp} value={editingTicket.registration_start || ''} onChange={e => setEditingTicket((et: any) => ({ ...et, registration_start: e.target.value }))} /></div>
                  <div><label className={label}>Registration Closes</label><input type="date" className={inp} value={editingTicket.registration_end || ''} onChange={e => setEditingTicket((et: any) => ({ ...et, registration_end: e.target.value }))} /></div>
                  <div className="md:col-span-2"><label className={label}>Description</label><textarea className={inp} rows={2} value={editingTicket.description || ''} onChange={e => setEditingTicket((et: any) => ({ ...et, description: e.target.value }))} /></div>
                  <div className="md:col-span-2"><label className={label}>Benefits (one per line)</label><textarea className={inp} rows={3} value={editingTicket.benefits || ''} onChange={e => setEditingTicket((et: any) => ({ ...et, benefits: e.target.value }))} /></div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editingTicket.is_active} onChange={e => setEditingTicket((et: any) => ({ ...et, is_active: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Active (Visible on registration form)</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => updateTicket(editingTicket)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"><Save size={14} />Save Ticket</button>
                    <button onClick={() => setEditingTicket(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: t.color || '#6366f1' }} />
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-600 font-medium">{t.price === 0 ? 'FREE' : `₹${t.price}`} · {t.capacity ? `${t.capacity} seats` : 'Unlimited capacity'}</p>
                      {!t.is_active && <span className="text-xs text-red-500 font-semibold">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingTicket({ ...t })} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Ticket size={16} /></button>
                    <button onClick={() => deleteTicket(t.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => addTicket()} disabled={!eventId}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">
            <Plus size={16} /> + Add Custom Ticket Type
          </button>
        </div>
      )}

      {/* TAB: Registration Fields */}
      {tab === 'fields' && (
        <div className="space-y-5">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first.</p>}

          {/* Suggested Preset Fields (UX Principle 18) */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">Suggested Form Questions (Click to quick-add):</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_FIELDS.map(sf => (
                <button key={sf.label} onClick={() => addField(sf)} disabled={!eventId}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  + {sf.label} ({sf.type})
                </button>
              ))}
            </div>
          </div>

          {fields.map((f, i) => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {editingField?.id === f.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className={label}>Question / Field Label</label><input className={inp} value={editingField.field_label} onChange={e => setEditingField((ef: any) => ({ ...ef, field_label: e.target.value }))} /></div>
                  <div><label className={label}>Field Type</label>
                    <select className={inp} value={editingField.field_type} onChange={e => setEditingField((ef: any) => ({ ...ef, field_type: e.target.value }))}>
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                  </div>
                  <div><label className={label}>Placeholder Text</label><input className={inp} value={editingField.placeholder || ''} onChange={e => setEditingField((ef: any) => ({ ...ef, placeholder: e.target.value }))} /></div>
                  <div><label className={label}>Helper / Description Text</label><input className={inp} value={editingField.description || ''} onChange={e => setEditingField((ef: any) => ({ ...ef, description: e.target.value }))} /></div>
                  {['dropdown', 'multiple_choice', 'checkbox'].includes(editingField.field_type) && (
                    <div className="md:col-span-2">
                      <label className={label}>Options (one option per line)</label>
                      <textarea className={inp} rows={4} value={editingField.options_str || (Array.isArray(editingField.options) ? editingField.options.join('\n') : '')}
                        onChange={e => setEditingField((ef: any) => ({ ...ef, options_str: e.target.value }))} placeholder="Vegetarian&#10;Non-Vegetarian&#10;Vegan&#10;Other" />
                    </div>
                  )}
                  <div className="md:col-span-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editingField.is_required} onChange={e => setEditingField((ef: any) => ({ ...ef, is_required: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                      <span className="text-sm font-semibold text-gray-700">Mandatory (Required Field)</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => updateField(editingField)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"><Save size={14} />Save Field</button>
                    <button onClick={() => setEditingField(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlignLeft size={16} className="text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{f.field_label} {f.is_required ? <span className="text-red-600 text-xs font-bold">*Required</span> : <span className="text-gray-400 text-xs">Optional</span>}</p>
                      <p className="text-xs text-gray-500 capitalize">{FIELD_TYPES.find(ft => ft.value === f.field_type)?.label || f.field_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveFieldOrder(i, 'up')} disabled={i === 0} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => moveFieldOrder(i, 'down')} disabled={i === fields.length - 1} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={15} /></button>
                    <button onClick={() => setEditingField({ ...f })} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Settings size={15} /></button>
                    <button onClick={() => deleteField(f.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => addField()} disabled={!eventId}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">
            <Plus size={16} /> + Add Custom Field
          </button>
        </div>
      )}

      {/* TAB: Payment */}
      {tab === 'payment' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className={label}>UPI ID for Attendees to Pay</label>
            <input className={inp} placeholder="yourname@okhdfcbank or business@upi" value={paySettings.upi_id} onChange={e => setPaySettings(p => ({ ...p, upi_id: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Payment QR Code Image</label>
            <ImageUpload label="QR Code" value={paySettings.upi_qr_image} onChange={url => setPaySettings(p => ({ ...p, upi_qr_image: url }))} folder="qr-image" />
          </div>
          <div>
            <label className={label}>Attendee Payment Instructions</label>
            <textarea className={inp} rows={4} placeholder="e.g. Scan the QR code or pay to the UPI ID above. Enter the 12-digit UTR/Transaction ID and attach your payment screenshot." value={paySettings.payment_instructions} onChange={e => setPaySettings(p => ({ ...p, payment_instructions: e.target.value }))} />
          </div>
          <button onClick={savePayment} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Payment Settings
          </button>
        </div>
      )}

      {/* TAB: Reschedule & Cancellation */}
      {tab === 'reschedule' && (
        <div className="space-y-6">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first.</p>}

          {/* Reschedule Box */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="text-indigo-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Reschedule Event</h2>
            </div>
            <p className="text-xs text-gray-500">Change date, time, or venue. This will automatically maintain audit history and generate notifications for all registered attendees.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className={label}>New Date</label>
                <input type="date" className={inp} value={rescheduleForm.new_date} onChange={e => setRescheduleForm(rf => ({ ...rf, new_date: e.target.value }))} />
              </div>
              <div>
                <label className={label}>New Start Time</label>
                <input type="time" className={inp} value={rescheduleForm.new_start_time} onChange={e => setRescheduleForm(rf => ({ ...rf, new_start_time: e.target.value }))} />
              </div>
              <div>
                <label className={label}>New Venue</label>
                <input className={inp} placeholder="Updated venue name" value={rescheduleForm.new_venue} onChange={e => setRescheduleForm(rf => ({ ...rf, new_venue: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className={label}>Reason for Rescheduling</label>
              <textarea className={inp} rows={2} placeholder="Explain why the event is being moved (sent to registered attendees)..." value={rescheduleForm.reason} onChange={e => setRescheduleForm(rf => ({ ...rf, reason: e.target.value }))} />
            </div>

            <button onClick={handleRescheduleSubmit} disabled={rescheduling || !eventId}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold">
              {rescheduling ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Reschedule & Notify Attendees
            </button>
          </div>

          {/* Reschedule History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-3">Schedule History</h3>
            {reschedules.length === 0 ? (
              <p className="text-gray-400 text-sm">No reschedules recorded for this event.</p>
            ) : (
              <div className="space-y-3">
                {reschedules.map((r: any) => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>Changed to: {formatDate(r.new_date)} {r.new_start_time} ({r.new_venue || 'Venue unchanged'})</span>
                      <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.previous_date && <p className="text-xs text-gray-500 mt-1">Previous: {formatDate(r.previous_date)} {r.previous_start_time} ({r.previous_venue})</p>}
                    <p className="text-xs text-indigo-700 mt-1 font-medium">Reason: {r.reason || 'None provided'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancellation Box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={20} />
              <h2 className="text-lg font-bold text-red-900">Event Cancellation</h2>
            </div>
            <p className="text-sm text-red-700">Cancelling the event marks it cancelled, blocks new registrations, and generates cancellation alerts for all registered attendees.</p>
            {form.status === 'cancelled' ? (
              <div className="p-3 bg-white rounded-lg border border-red-300">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-xs uppercase">Cancelled</span>
                <p className="text-sm text-red-900 mt-2 font-medium">Reason: {form.cancellation_reason || 'No cancellation reason provided'}</p>
                <button onClick={() => changeStatus('draft')} className="mt-3 px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-700">
                  Revert to Draft Status
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCancelModal(true)} disabled={!eventId}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                Cancel Entire Event
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB: Publish & Share */}
      {tab === 'publish' && (
        <div className="space-y-5">
          {(!eventId && isNew) && <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please save Basic Info first.</p>}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">Event Status</p>
                <p className="text-sm text-gray-500">Only "Published" events can be viewed and registered by the public.</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${form.status === 'published' ? 'bg-green-100 text-green-700' : form.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {form.status.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-2">
              {form.status !== 'published' && <button onClick={() => changeStatus('published')} disabled={!eventId} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40">🟢 Publish Event</button>}
              {form.status === 'published' && <button onClick={() => changeStatus('draft')} className="px-5 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700">📝 Unpublish (Set Draft)</button>}
              {form.status !== 'cancelled' && <button onClick={() => setShowCancelModal(true)} disabled={!eventId} className="px-5 py-2.5 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-40">❌ Cancel Event</button>}
              {form.status !== 'completed' && <button onClick={() => changeStatus('completed')} disabled={!eventId} className="px-5 py-2.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-sm font-semibold hover:bg-blue-200 disabled:opacity-40">✅ Mark Completed</button>}
            </div>
          </div>

          {eventId && form.slug && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-bold text-gray-900 text-lg">Public Sharing & QR Code</h3>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <Globe size={18} className="text-indigo-600 flex-shrink-0" />
                <span className="text-sm font-mono text-gray-800 flex-1 truncate">{publicUrl}</span>
                <button onClick={() => { navigator.clipboard.writeText(publicUrl); showToast('Link copied to clipboard!') }}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1">
                  <Copy size={13} /> Copy Link
                </button>
                <a href={publicUrl} target="_blank" className="p-1.5 text-gray-500 hover:text-indigo-600">
                  <ExternalLink size={16} />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Direct Social Share</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Check out ${form.name}: ${publicUrl}`)}`} target="_blank"
                      className="py-2 px-3 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 text-center">📱 WhatsApp</a>
                    <a href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(form.name)}`} target="_blank"
                      className="py-2 px-3 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 text-center">✈️ Telegram</a>
                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(form.name)}`} target="_blank"
                      className="py-2 px-3 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600 text-center">🐦 Twitter/X</a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`} target="_blank"
                      className="py-2 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 text-center">📘 Facebook</a>
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Event URL QR Code</p>
                  <img src={qrUrl} alt="Event QR" className="w-36 h-36 mx-auto border border-gray-300 rounded-lg bg-white p-1" />
                  <a href={qrUrl} download="event-qr.png" target="_blank" className="text-xs text-indigo-600 hover:underline mt-2 inline-block font-medium">Download QR Code Image</a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-bold text-gray-900">Cancel Event</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">Please provide a reason for cancelling. This will be recorded and notified to attendees.</p>
            <textarea
              className={inp}
              rows={3}
              placeholder="e.g. Unforeseen weather conditions, organizer emergency..."
              value={cancelReasonInput}
              onChange={e => setCancelReasonInput(e.target.value)}
            />
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Keep Event</button>
              <button
                onClick={() => {
                  changeStatus('cancelled', cancelReasonInput)
                  setShowCancelModal(false)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
