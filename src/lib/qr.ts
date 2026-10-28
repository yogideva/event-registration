import { v4 as uuidv4 } from 'uuid'
import { generateTicketCode } from './utils'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

export async function generateQRTicket(
  db: any,
  regId: string,
  event: any,
  attendee: any,
  ticket: any,
  regNumber: string
) {
  const ticketId = uuidv4()
  const ticketCode = generateTicketCode()
  const qrData = JSON.stringify({
    type: 'event_ticket',
    ticket_code: ticketCode,
    registration_id: regId,
    registration_number: regNumber,
    event_id: event.id,
    event_name: event.name,
    attendee_name: attendee.name,
    ticket_type: ticket?.name || 'General',
    date: event.date,
    venue: event.venue_name,
  })

  const uploadsDir = path.resolve(process.cwd(), 'public/uploads/qr')
  fs.mkdirSync(uploadsDir, { recursive: true })
  const qrFilename = `${ticketCode}.png`
  const qrPath = path.join(uploadsDir, qrFilename)
  await QRCode.toFile(qrPath, qrData, { width: 300, margin: 2 })

  db.prepare('INSERT INTO qr_tickets (id, ticket_code, registration_id, qr_data, qr_image_url) VALUES (?,?,?,?,?)')
    .run(ticketId, ticketCode, regId, qrData, `/uploads/qr/${qrFilename}`)
}
