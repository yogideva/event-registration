'use client'
import { useState, useRef, useEffect } from 'react'
import { QrCode, CheckCircle, XCircle, AlertCircle, Search, User, Calendar, Ticket, CreditCard, Camera, CameraOff } from 'lucide-react'

export default function ScannerPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [staffName, setStaffName] = useState('Admin Staff')
  const [useCamera, setUseCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let interval: any
    if (useCamera) {
      startCamera().then(() => {
        // Try BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          interval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current)
                if (barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue
                  if (rawValue) {
                    stopCamera()
                    setUseCamera(false)
                    setCode(rawValue)
                    verifyCode(rawValue)
                  }
                }
              } catch (e) {}
            }
          }, 500)
        }
      })
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
      if (interval) clearInterval(interval)
    }
  }, [useCamera])

  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err: any) {
      setCameraError('Camera access not granted or not available. Use manual / barcode scanner input.')
      setUseCamera(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  async function verifyCode(codeToVerify: string) {
    if (!codeToVerify.trim()) return
    setLoading(true)
    setCheckedIn(false)
    try {
      const res = await fetch('/api/scanner/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_code: codeToVerify.trim() })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ valid: false, message: 'Network error verifying ticket', status: 'error' })
    }
    setLoading(false)
  }

  async function doCheckIn() {
    if (!result?.ticket) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/scanner/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_ticket_id: result.ticket.id,
          registration_id: result.ticket.registration_id,
          event_id: result.ticket.event_id,
          staff_name: staffName || 'Gate Staff'
        })
      })
      const data = await res.json()
      if (data.ok) {
        setCheckedIn(true)
        setResult((r: any) => ({ ...r, status: 'already_checked_in', message: `Successfully checked in by ${staffName}!` }))
      }
    } catch (e) {}
    setCheckingIn(false)
  }

  function reset() {
    setCode('')
    setResult(null)
    setCheckedIn(false)
    inputRef.current?.focus()
  }

  function getStatusStyle(status: string) {
    if (status === 'valid') return { bg: 'bg-green-50 border-green-300', icon: CheckCircle, iconColor: 'text-green-600', title: 'text-green-900' }
    if (status === 'already_checked_in') return { bg: 'bg-amber-50 border-amber-300', icon: AlertCircle, iconColor: 'text-amber-600', title: 'text-amber-900' }
    return { bg: 'bg-red-50 border-red-300', icon: XCircle, iconColor: 'text-red-600', title: 'text-red-900' }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Venue QR Scanner & Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">Scan tickets at venue gates, verify payments, and log check-ins in real time.</p>
      </div>

      {/* Staff ID Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Scanning Staff / Gate Identifier</label>
          <input
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            placeholder="e.g. Gate 1 - Staff Name"
          />
        </div>
        <button
          onClick={() => setUseCamera(!useCamera)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-colors mt-4 ${useCamera ? 'bg-red-50 border-red-300 text-red-700' : 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'}`}>
          {useCamera ? <CameraOff size={14} /> : <Camera size={14} />}
          {useCamera ? 'Turn Camera Off' : 'Live Camera Scanner'}
        </button>
      </div>

      {/* Live Camera View if Active */}
      {useCamera && (
        <div className="bg-black rounded-xl overflow-hidden mb-4 relative aspect-video flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl relative shadow-2xl animate-pulse">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white" />
            </div>
          </div>
          <p className="absolute bottom-3 text-xs text-white/90 bg-black/60 px-3 py-1 rounded-full">Point camera at Attendee QR Ticket</p>
        </div>
      )}

      {cameraError && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">{cameraError}</div>}

      {/* Scanner Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <QrCode size={20} className="text-indigo-600" />
          <p className="font-bold text-gray-900">Scan or Enter Ticket Code</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyCode(code)}
            placeholder="Scan barcode/QR or type ticket code (e.g. TKT-ABC123)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-base"
            autoFocus
          />
          <button onClick={() => verifyCode(code)} disabled={loading || !code.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
            Verify
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">💡 Supports handheld USB barcode/QR guns (they auto-type and submit) as well as live camera scanning.</p>
      </div>

      {/* Result Card */}
      {result && (
        <div className={`rounded-xl border-2 p-6 shadow-md transition-all ${getStatusStyle(result.status).bg}`}>
          <div className="flex items-start gap-4">
            {(() => {
              const style = getStatusStyle(result.status)
              const Icon = style.icon
              return <Icon size={36} className={`${style.iconColor} flex-shrink-0 mt-0.5`} />
            })()}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-xl ${getStatusStyle(result.status).title}`}>{result.message}</p>

              {result.ticket && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1"><User size={13} className="text-gray-400" /><p className="text-xs text-gray-500 font-semibold">Attendee</p></div>
                      <p className="font-bold text-gray-900">{result.ticket.attendee_name}</p>
                      <p className="text-xs text-gray-500 truncate">{result.ticket.attendee_email}</p>
                      {result.ticket.attendee_phone && <p className="text-xs text-gray-500">{result.ticket.attendee_phone}</p>}
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1"><Calendar size={13} className="text-gray-400" /><p className="text-xs text-gray-500 font-semibold">Event</p></div>
                      <p className="font-bold text-gray-900 text-sm truncate">{result.ticket.event_name}</p>
                      <p className="text-xs text-gray-500">{result.ticket.event_date ? formatDate(result.ticket.event_date) : ''}</p>
                      {result.ticket.venue_name && <p className="text-xs text-gray-500 truncate">{result.ticket.venue_name}</p>}
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1"><Ticket size={13} className="text-gray-400" /><p className="text-xs text-gray-500 font-semibold">Ticket Type</p></div>
                      <p className="font-bold text-gray-900">{result.ticket.ticket_type || 'General'}</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center gap-1.5 mb-1"><CreditCard size={13} className="text-gray-400" /><p className="text-xs text-gray-500 font-semibold">Payment Status</p></div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${result.ticket.payment_status === 'verified' || result.ticket.payment_status === 'free' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {result.ticket.payment_status}
                      </span>
                      <p className="text-xs font-bold text-gray-800 mt-1">₹{result.ticket.amount || 0}</p>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-gray-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-500 font-medium">Registration Number: </span>
                      <span className="font-mono font-bold text-gray-900">{result.ticket.registration_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Ticket Code: </span>
                      <span className="font-mono font-bold text-gray-900">{result.ticket.ticket_code}</span>
                    </div>
                  </div>

                  {result.checkin && (
                    <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 text-xs text-amber-900">
                      <p className="font-bold">⚠️ Check-in History:</p>
                      <p className="mt-0.5">Checked in on: <strong>{new Date(result.checkin.checked_in_at).toLocaleString()}</strong></p>
                      {result.checkin.staff_name && <p>Staff: <strong>{result.checkin.staff_name}</strong></p>}
                    </div>
                  )}

                  {result.status === 'valid' && !checkedIn && (
                    <button onClick={doCheckIn} disabled={checkingIn}
                      className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-60 text-base shadow-md">
                      {checkingIn ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={20} />}
                      Check In Attendee
                    </button>
                  )}

                  {checkedIn && (
                    <div className="bg-green-600 text-white py-3.5 rounded-xl text-center font-bold text-base flex items-center justify-center gap-2 shadow-md">
                      <CheckCircle size={20} /> Attendee Successfully Checked In!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button onClick={reset} className="mt-5 w-full border border-gray-300 bg-white py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
            Scan Next Ticket
          </button>
        </div>
      )}

      {/* Guide */}
      {!result && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-indigo-900 space-y-2 text-sm">
          <p className="font-bold flex items-center gap-2"><QrCode size={16} /> QR Scanner Instructions</p>
          <ul className="space-y-1 text-xs opacity-90 pl-4 list-disc">
            <li>Attendees present their digital ticket or printed QR code.</li>
            <li>Use the Live Camera button to scan via mobile/laptop webcam.</li>
            <li>Alternatively, point any handheld USB QR scanner at the ticket.</li>
            <li>The system checks ticket validity, verifies payment, and blocks duplicates.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
