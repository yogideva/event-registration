'use client'
import { useState, useEffect } from 'react'
import { Save, Upload, X, Loader2, CheckCircle, GripVertical, Eye, EyeOff, Lock, ShieldCheck, Key } from 'lucide-react'

const TABS = [
  { key: 'org', label: 'Organization' },
  { key: 'branding', label: 'Branding' },
  { key: 'payment', label: 'Payment' },
  { key: 'policies', label: 'Policies' },
  { key: 'social', label: 'Social Media' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'security', label: 'Security & Password' },
]

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-green-600">
      <CheckCircle size={16} /> {msg}
    </div>
  )
}

function ImageUploadBtn({ label, value, onChange, folder }: any) {
  const [loading, setLoading] = useState(false)
  const ref = { current: null as HTMLInputElement | null }
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_base64: base64, filename: file.name, folder }) })
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
        <div className="flex items-center gap-3">
          <img src={value} alt={label} className="h-16 w-auto rounded-lg border border-gray-200 object-cover" />
          <button onClick={() => onChange('')} className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e: any) => handle(e); i.click() }} disabled={loading}
          className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 text-sm">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Uploading...' : `Upload ${label}`}
        </button>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('org')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [sidebar, setSidebar] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab')
      if (t && ['org', 'branding', 'payment', 'policies', 'social', 'navigation', 'security'].includes(t)) {
        setTab(t)
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d))
    fetch('/api/sidebar').then(r => r.json()).then(d => setSettings(prev => { setSidebar(Array.isArray(d) ? d : []); return prev }))
  }, [])

  useEffect(() => {
    fetch('/api/sidebar').then(r => r.json()).then(d => setSidebar(Array.isArray(d) ? d : []))
  }, [])

  function set(key: string, value: string) { setSettings(s => ({ ...s, [key]: value })) }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Please fill in all password fields.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirm password do not match.')
      return
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters long.')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error || 'Failed to update password.')
      } else {
        setPwSuccess(data.message || 'Password updated successfully!')
        setToast('Password updated successfully!')
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
      }
    } catch (err: any) {
      setPwError('Network error. Please try again.')
    } finally {
      setPwLoading(false)
    }
  }

  async function save(keys?: string[]) {
    setSaving(true)
    const toSave = keys ? Object.fromEntries(keys.map(k => [k, settings[k] || ''])) : settings
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSave) })
    setToast('Settings saved!')
    setSaving(false)
  }

  async function saveSidebar() {
    setSaving(true)
    await fetch('/api/sidebar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sidebar) })
    setToast('Navigation saved!')
    setSaving(false)
  }

  function moveSidebar(i: number, dir: 'up' | 'down') {
    const arr = [...sidebar]
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]
    setSidebar(arr)
  }

  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const lbl = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Organization */}
      {tab === 'org' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <ImageUploadBtn label="Organization Logo" value={settings.org_logo || ''} onChange={(v: string) => set('org_logo', v)} folder="logo" />
          <div><label className={lbl}>Organization Name</label><input className={inp} value={settings.org_name || ''} onChange={e => set('org_name', e.target.value)} /></div>
          <div><label className={lbl}>Description</label><textarea className={inp} rows={3} value={settings.org_description || ''} onChange={e => set('org_description', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lbl}>Email</label><input type="email" className={inp} value={settings.org_email || ''} onChange={e => set('org_email', e.target.value)} /></div>
            <div><label className={lbl}>Phone</label><input className={inp} value={settings.org_phone || ''} onChange={e => set('org_phone', e.target.value)} /></div>
            <div><label className={lbl}>Website</label><input className={inp} value={settings.org_website || ''} onChange={e => set('org_website', e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Address</label><textarea className={inp} rows={2} value={settings.org_address || ''} onChange={e => set('org_address', e.target.value)} /></div>
          <button onClick={() => save(['org_name','org_logo','org_description','org_email','org_phone','org_website','org_address'])} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      )}

      {/* Branding */}
      {tab === 'branding' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={settings.primary_color || '#6366f1'} onChange={e => set('primary_color', e.target.value)} className="h-9 w-16 border border-gray-300 rounded-lg cursor-pointer" />
                <input className={inp} value={settings.primary_color || '#6366f1'} onChange={e => set('primary_color', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={lbl}>Accent Color</label>
              <div className="flex gap-2">
                <input type="color" value={settings.accent_color || '#f59e0b'} onChange={e => set('accent_color', e.target.value)} className="h-9 w-16 border border-gray-300 rounded-lg cursor-pointer" />
                <input className={inp} value={settings.accent_color || '#f59e0b'} onChange={e => set('accent_color', e.target.value)} />
              </div>
            </div>
          </div>
          <div><label className={lbl}>Ticket Footer Text</label><input className={inp} value={settings.ticket_footer_text || ''} onChange={e => set('ticket_footer_text', e.target.value)} /></div>
          <div><label className={lbl}>Registration Confirmation Message</label><textarea className={inp} rows={3} value={settings.confirmation_message || ''} onChange={e => set('confirmation_message', e.target.value)} /></div>
          <div><label className={lbl}>Footer Text</label><textarea className={inp} rows={2} value={settings.footer_text || ''} onChange={e => set('footer_text', e.target.value)} /></div>
          <button onClick={() => save(['primary_color','accent_color','ticket_footer_text','confirmation_message','footer_text'])} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      )}

      {/* Payment */}
      {tab === 'payment' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div><label className={lbl}>UPI ID</label><input className={inp} placeholder="yourname@upi" value={settings.upi_id || ''} onChange={e => set('upi_id', e.target.value)} /></div>
          <ImageUploadBtn label="UPI QR Code Image" value={settings.upi_qr_image || ''} onChange={(v: string) => set('upi_qr_image', v)} folder="qr-image" />
          <div><label className={lbl}>Payment Instructions</label><textarea className={inp} rows={4} value={settings.payment_instructions || ''} onChange={e => set('payment_instructions', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Currency</label>
              <select className={inp} value={settings.currency || 'INR'} onChange={e => set('currency', e.target.value)}>
                <option value="INR">INR</option><option value="USD">USD</option>
                <option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AED">AED</option>
              </select>
            </div>
            <div><label className={lbl}>Currency Symbol</label><input className={inp} value={settings.currency_symbol || '₹'} onChange={e => set('currency_symbol', e.target.value)} /></div>
          </div>
          <button onClick={() => save(['upi_id','upi_qr_image','payment_instructions','currency','currency_symbol'])} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      )}

      {/* Policies */}
      {tab === 'policies' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div><label className={lbl}>Terms & Conditions</label><textarea className={inp} rows={6} value={settings.terms_conditions || ''} onChange={e => set('terms_conditions', e.target.value)} /></div>
          <div><label className={lbl}>Privacy Policy</label><textarea className={inp} rows={6} value={settings.privacy_policy || ''} onChange={e => set('privacy_policy', e.target.value)} /></div>
          <div><label className={lbl}>Refund Policy</label><textarea className={inp} rows={6} value={settings.refund_policy || ''} onChange={e => set('refund_policy', e.target.value)} /></div>
          <button onClick={() => save(['terms_conditions','privacy_policy','refund_policy'])} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      )}

      {/* Social Media */}
      {tab === 'social' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[
            { key: 'social_facebook', label: '📘 Facebook URL' },
            { key: 'social_instagram', label: '📸 Instagram URL' },
            { key: 'social_twitter', label: '🐦 Twitter/X URL' },
            { key: 'social_youtube', label: '▶️ YouTube URL' },
            { key: 'social_telegram', label: '✈️ Telegram URL' },
            { key: 'social_whatsapp', label: '📱 WhatsApp URL' },
          ].map(({ key, label }) => (
            <div key={key}><label className={lbl}>{label}</label><input type="url" className={inp} placeholder="https://..." value={settings[key] || ''} onChange={e => set(key, e.target.value)} /></div>
          ))}
          <button onClick={() => save(['social_facebook','social_instagram','social_twitter','social_youtube','social_telegram','social_whatsapp'])} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      )}

      {/* Navigation */}
      {tab === 'navigation' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Reorder, rename, or hide sidebar navigation items.</p>
          <div className="space-y-2">
            {sidebar.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <GripVertical size={16} className="text-gray-400" />
                <input className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={item.label} onChange={e => setSidebar(s => s.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                <button onClick={() => setSidebar(s => s.map((x, j) => j === i ? { ...x, is_visible: x.is_visible ? 0 : 1 } : x))}
                  className={`p-1.5 rounded ${item.is_visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                  {item.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => moveSidebar(i, 'up')} disabled={i === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">↑</button>
                  <button onClick={() => moveSidebar(i, 'down')} disabled={i === sidebar.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">↓</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveSidebar} disabled={saving} className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Navigation
          </button>
        </div>
      )}

      {/* Security & Password */}
      {tab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Admin Password</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Update your login password for the EventPro Admin Portal.
              </p>
            </div>
          </div>

          {pwError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <X size={16} className="flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle size={16} className="flex-shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
            <div>
              <label className={lbl}>Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  className={`${inp} pr-10`}
                  placeholder="Enter your current password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className={lbl}>New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className={`${inp} pr-10`}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className={lbl}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className={`${inp} pr-10`}
                  placeholder="Re-enter your new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium text-sm transition-colors shadow-sm"
              >
                {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {pwLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Security Guidance:</p>
            <p>• Passwords must be at least 6 characters long.</p>
            <p>• Your new password becomes active immediately for all future sign-ins.</p>
            <p>• Keep your credentials secure and never share them with unauthorized persons.</p>
          </div>
        </div>
      )}
    </div>
  )
}
