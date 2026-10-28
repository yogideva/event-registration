'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Upload, Loader2, ChevronLeft } from 'lucide-react'
import { formatDate, formatTime, safeJsonParse } from '../../utils'

const STEPS = ['Select Ticket', 'Your Details', 'Payment', 'Confirmation']

export default function RegisterPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug as string
  const preselectedTicket = searchParams.get('ticket')

  const [event, setEvent] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [registration, setRegistration] = useState<any>(null)
  const [payment, setPayment] = useState<any>(null)

  // Payment form
  const [txnId, setTxnId] = useState('')
  const [payMethod, setPayMethod] = useState('upi')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofBase64, setProofBase64] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${slug}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]).then(([ev, st]) => {
      setEvent(ev)
      setSettings(st)
      if (preselectedTicket && ev.ticketTypes) {
        const t = ev.ticketTypes.find((t: any) => t.id === preselectedTicket)
        if (t) { setSelectedTicket(t); setStep(1) }
      }
      setLoading(false)
    })
  }, [slug, preselectedTicket])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, fieldId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFormValues(v => ({ ...v, [fieldId]: ev.target?.result }))
    reader.readAsDataURL(file)
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = ev => setProofBase64(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function submitRegistration() {
    setSubmitting(true)
    setError('')
    const fields = event.customFields || []
    const required = fields.filter((f: any) => f.is_required)
    for (const f of required) {
      if (!formValues[f.id] && !formValues[f.field_label]) {
        setError(`"${f.field_label}" is required`); setSubmitting(false); return
      }
    }
    const name = formValues['name'] || formValues['Name'] || formValues['Full Name'] || formValues['Participant Name'] || Object.values(formValues)[0] || 'Attendee'
    const email = formValues['email'] || formValues['Email'] || Object.entries(formValues).find(([k]) => k.toLowerCase().includes('email'))?.[1] || ''
    const phone = formValues['phone'] || formValues['Phone'] || formValues['Mobile'] || ''
    if (!email) { setError('Email is required'); setSubmitting(false); return }

    const res = await fetch('/api/registrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        ticket_type_id: selectedTicket?.id || null,
        name, email, phone,
        custom_fields: formValues
      })
    })
    const data = await res.json()
    if (data.registration) {
      setRegistration(data.registration)
      setPayment(data.payment)
      const amount = selectedTicket?.price || (event.is_free ? 0 : event.base_fee) || 0
      if (amount === 0) { setStep(3) } else { setStep(2) }
    } else {
      setError(data.error || 'Registration failed')
    }
    setSubmitting(false)
  }

  async function submitPayment() {
    setSubmitting(true)
    setError('')
    if (!txnId && !proofBase64) { setError('Please enter a transaction ID or upload payment proof'); setSubmitting(false); return }
    const res = await fetch('/api/payments/proof', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_id: registration.id,
        transaction_id: txnId,
        method: payMethod,
        payment_proof_base64: proofBase64,
        filename: proofFile?.name || 'proof.jpg'
      })
    })
    const data = await res.json()
    if (data.ok) setStep(3)
    else setError(data.error || 'Payment submission failed')
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!event || event.error || event.status !== 'published') return (
    <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Event not available</p></div>
  )

  const amount = selectedTicket?.price ?? (event.is_free ? 0 : event.base_fee) ?? 0
  const isFree = amount === 0
  const customFields = event.customFields || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/event/${slug}`)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <p className="font-bold text-gray-900">{event.name}</p>
            <p className="text-xs text-gray-500">{event.date ? formatDate(event.date) : ''}{event.venue_name ? ` · ${event.venue_name}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-indigo-700' : 'text-gray-500'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {/* STEP 0: Select Ticket */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Choose Your Ticket</h2>
            {(event.ticketTypes || []).filter((t: any) => t.is_active).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-500 mb-3">No ticket types available. Registering with default option.</p>
                <button onClick={() => { setSelectedTicket(null); setStep(1) }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                  Continue →
                </button>
              </div>
            ) : (
              (event.ticketTypes || []).filter((t: any) => t.is_active).map((ticket: any) => (
                <div key={ticket.id} onClick={() => { setSelectedTicket(ticket); setStep(1) }}
                  className="bg-white rounded-xl border-2 border-gray-200 p-5 cursor-pointer hover:border-indigo-400 transition-all hover:shadow-md"
                  style={{ borderLeftColor: ticket.color || '#6366f1', borderLeftWidth: 4 }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{ticket.name}</p>
                      {ticket.description && <p className="text-gray-500 text-sm mt-1">{ticket.description}</p>}
                      {ticket.benefits && <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{ticket.benefits}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-2xl font-bold text-indigo-600">{ticket.price === 0 ? 'FREE' : `₹${ticket.price}`}</p>
                      {ticket.capacity && <p className="text-xs text-gray-400">{ticket.capacity} seats</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <span className="text-indigo-600 text-sm font-medium flex items-center gap-1">Select <ArrowRight size={14} /></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
            {selectedTicket && <p className="text-sm text-gray-500 mb-5">Ticket: <strong>{selectedTicket.name}</strong> — {selectedTicket.price === 0 ? 'FREE' : `₹${selectedTicket.price}`}</p>}

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {/* If no custom fields configured, show defaults */}
              {customFields.length === 0 ? (
                <>
                  {[
                    { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your full name' },
                    { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'your@email.com' },
                    { id: 'phone', label: 'Phone Number', type: 'phone', required: false, placeholder: '+91 XXXXXXXXXX' },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                      <input type={f.type === 'phone' ? 'tel' : f.type} placeholder={f.placeholder}
                        value={formValues[f.id] || ''}
                        onChange={e => setFormValues(v => ({ ...v, [f.id]: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ))}
                </>
              ) : (
                customFields.map((field: any) => {
                  const val = formValues[field.id] || formValues[field.field_label] || ''
                  const opts = safeJsonParse(field.options, [])
                  const setVal = (v: any) => setFormValues(fv => ({ ...fv, [field.id]: v, [field.field_label]: v }))
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.field_label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {field.description && <p className="text-xs text-gray-500 mb-1">{field.description}</p>}

                      {['text', 'email', 'number', 'url'].includes(field.field_type) && (
                        <input type={field.field_type === 'text' ? 'text' : field.field_type} placeholder={field.placeholder}
                          value={val} onChange={e => setVal(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      )}
                      {field.field_type === 'phone' && (
                        <input type="tel" placeholder={field.placeholder} value={val} onChange={e => setVal(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      )}
                      {field.field_type === 'long_text' || field.field_type === 'address' ? (
                        <textarea placeholder={field.placeholder} value={val} onChange={e => setVal(e.target.value)} rows={3}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      ) : null}
                      {field.field_type === 'date' && (
                        <input type="date" value={val} onChange={e => setVal(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      )}
                      {field.field_type === 'time' && (
                        <input type="time" value={val} onChange={e => setVal(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      )}
                      {field.field_type === 'dropdown' && (
                        <select value={val} onChange={e => setVal(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">— Select —</option>
                          {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {field.field_type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {opts.map((o: string) => (
                            <label key={o} className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={field.id} value={o} checked={val === o} onChange={() => setVal(o)} className="accent-indigo-600" />
                              <span className="text-sm text-gray-700">{o}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {field.field_type === 'checkbox' && (
                        <div className="space-y-2">
                          {opts.length > 0 ? opts.map((o: string) => {
                            const checked = Array.isArray(val) ? val.includes(o) : false
                            return (
                              <label key={o} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={checked} className="accent-indigo-600" onChange={e => {
                                  const arr = Array.isArray(val) ? [...val] : []
                                  if (e.target.checked) setVal([...arr, o]); else setVal(arr.filter((x: string) => x !== o))
                                }} />
                                <span className="text-sm text-gray-700">{o}</span>
                              </label>
                            )
                          }) : (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={!!val} onChange={e => setVal(e.target.checked)} className="accent-indigo-600" />
                              <span className="text-sm text-gray-700">{field.field_label}</span>
                            </label>
                          )}
                        </div>
                      )}
                      {(field.field_type === 'file_upload' || field.field_type === 'image_upload') && (
                        <input type="file" accept={field.field_type === 'image_upload' ? 'image/*' : '*'}
                          onChange={e => handleFileChange(e, field.id)}
                          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100" />
                      )}
                    </div>
                  )
                })
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Back</button>
                <button onClick={submitRegistration} disabled={submitting}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isFree ? 'Complete Registration' : 'Continue to Payment →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Payment */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Complete Payment</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Amount Due</p>
                  <p className="text-3xl font-bold text-indigo-700">₹{amount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedTicket?.name || 'Registration'}</p>
                </div>
                <p className="text-4xl">💳</p>
              </div>

              {settings.payment_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  {settings.payment_instructions}
                </div>
              )}

              {settings.upi_id && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Pay via UPI</p>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 font-mono text-gray-800 flex items-center justify-between">
                    <span>{settings.upi_id}</span>
                    <button onClick={() => navigator.clipboard.writeText(settings.upi_id)} className="text-indigo-600 text-xs hover:underline">Copy</button>
                  </div>
                </div>
              )}

              {settings.upi_qr_image && (
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Scan QR Code</p>
                  <img src={settings.upi_qr_image} alt="UPI QR" className="w-44 h-44 mx-auto border border-gray-200 rounded-xl" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID / UTR Number <span className="text-red-500">*</span></label>
                <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Enter transaction/UTR ID after payment"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Payment Screenshot</label>
                <input type="file" accept="image/*" onChange={handleProofChange}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium" />
                {proofBase64 && <img src={proofBase64} alt="proof" className="mt-2 h-24 rounded-lg border border-gray-200" />}
              </div>

              <button onClick={submitPayment} disabled={submitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Submit Payment for Verification
              </button>
              <p className="text-xs text-gray-400 text-center">Your registration will be confirmed after payment verification by the organizer.</p>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <div className="text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isFree ? 'Registration Confirmed!' : 'Payment Submitted!'}
              </h2>
              <p className="text-gray-500 mb-6">
                {isFree
                  ? (settings.confirmation_message || 'Your registration is confirmed. See you at the event!')
                  : 'Thank you! Your payment is under review. You will receive confirmation once verified.'}
              </p>

              {registration && (
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Registration #</span>
                    <span className="font-mono font-semibold">{registration.registration_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Event</span>
                    <span className="font-medium">{event.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${registration.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {registration.status}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => router.push(`/event/${slug}`)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  ← Back to Event
                </button>
                {registration && (
                  <a href={`/event/${slug}/ticket/${registration.id}`} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 text-center">
                    View Ticket →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
