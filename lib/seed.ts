import { getDb } from './db'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export async function seedDemoData() {
  const db = getDb()

  // 1. Ensure Admin exists
  let adminId = 'admin-system'
  const existingAdmin = db.prepare("SELECT * FROM admins WHERE email = 'admin@eventpro.com'").get() as any
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 10)
    db.prepare(`
      INSERT INTO admins (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'admin@eventpro.com', hash, 'Administrator', 'super_admin')
  } else {
    adminId = existingAdmin.id
  }

  // 2. Ensure at least one rich showcase event exists
  const eventCount = (db.prepare('SELECT COUNT(*) as c FROM events').get() as any).c
  if (eventCount === 0) {
    const eventId = uuidv4()
    const catWorkshop = (db.prepare("SELECT id FROM categories WHERE slug = 'workshop'").get() as any)?.id

    db.prepare(`
      INSERT INTO events (
        id, slug, name, category_id, description, about, status,
        poster, banner, date, start_time, end_time,
        venue_name, venue_address, maps_link,
        organizer_name, organizer_phone, organizer_email,
        registration_start, registration_end, max_participants,
        is_free, base_fee, currency, terms, refund_policy, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      eventId,
      'global-ai-and-web-summit-2026',
      'Global AI & Web Innovation Summit 2026',
      catWorkshop || null,
      'Join top engineers, entrepreneurs, and researchers for an immersive 2-day conference on Next-Gen Artificial Intelligence, Agents, and Cloud Architecture.',
      'The Global AI & Web Innovation Summit 2026 brings together thought leaders, practitioners, and technology pioneers from around the world. Experience keynote speeches, hands-on masterclasses, and executive networking sessions designed to empower developers and founders.',
      'published',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80',
      '2026-11-15',
      '09:30',
      '18:00',
      'Silicon Valley Convention Center',
      '150 Tech Park Boulevard, Silicon City, Bangalore, 560100',
      'https://maps.google.com',
      'Innovation Guild International',
      '+91 9876543210',
      'summit@eventpro.com',
      '2026-10-01',
      '2026-11-14',
      500,
      0,
      1499,
      'INR',
      'Attendees must present a valid digital QR ticket upon check-in. Audio/video recording during keynotes is prohibited without press credentials.',
      'Full refund if cancelled 7 days before the event. 50% refund thereafter up to 48 hours prior to start.',
      adminId
    )

    // Add Ticket Types
    const tickets = [
      ['Early Bird Pass', 'Discounted all-access pass for early registrations', 999, 100, '#10b981', 'Access to all keynote stages\nConference swag kit\nLunch and refreshments'],
      ['Regular Admission', 'Standard full conference entry pass', 1499, 300, '#6366f1', 'Access to all tracks & breakout workshops\nNetworking lounge entry\nDigital certificate'],
      ['VIP Executive Pass', 'Premium all-inclusive pass with speaker lounge access', 2999, 50, '#f59e0b', 'Priority front-row seating\nExclusive VIP dinner & speakers dinner\nLifetime session recording recordings\n1-on-1 mentor booking slot'],
      ['Student Pass', 'Discounted ticket for university and college students', 499, 50, '#0ea5e9', 'Valid college student ID required\nFull track admission\nLunch included']
    ]

    const insertTicket = db.prepare(`
      INSERT INTO ticket_types (id, event_id, name, description, price, capacity, color, benefits, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `)
    tickets.forEach((t, i) => insertTicket.run(uuidv4(), eventId, t[0], t[1], t[2], t[3], t[4], t[5], i + 1))

    // Add Custom Sections
    const sections = [
      ['Conference Schedule & Agenda', 'Day 1:\n09:30 AM - Keynote: The Agentic Revolution\n11:00 AM - Panel: Next-Gen Web Applications\n01:00 PM - Networking Buffet Lunch\n02:30 PM - Deep Dive Workshop Tracks\n05:00 PM - Startup Pitch Showcase\n\nDay 2:\n10:00 AM - Scaling Distributed Systems\n01:00 PM - Closing Ceremony & Awards', 'text'],
      ['Keynote Speakers', 'Featuring principal engineers and AI researchers from top tech laboratories, Fortune 500 tech architects, and unicorn founders sharing practical takeaways.', 'text'],
      ['Important Instructions & What to Bring', '1. Bring your digital QR ticket saved on your mobile or printed.\n2. Laptops are encouraged for the hands-on workshop tracks.\n3. Government photo ID matching your registration name is required at gate check-in.', 'text'],
      ['Frequently Asked Questions (FAQs)', 'Q: Can I transfer my ticket?\nA: Yes, ticket assignments can be edited in coordination with the organizer.\n\nQ: Is parking available?\nA: Free basement parking is available for all registered attendees.', 'text']
    ]

    const insertSection = db.prepare(`
      INSERT INTO event_sections (id, event_id, title, content, type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    sections.forEach((s, i) => insertSection.run(uuidv4(), eventId, s[0], s[1], s[2], i + 1))

    // Add Custom Registration Form Fields
    const fields = [
      ['Full Name', 'full_name', 'text', 'Enter your full name', '', 1, '[]'],
      ['Work Email', 'email', 'email', 'name@company.com', 'Used for ticket delivery', 1, '[]'],
      ['WhatsApp Number', 'phone', 'phone', '+91 9876543210', 'For event day updates', 1, '[]'],
      ['Company / College Name', 'organization', 'text', 'Organization or University', '', 0, '[]'],
      ['Job Title / Designation', 'job_title', 'text', 'e.g. Senior Software Engineer', '', 0, '[]'],
      ['Dietary Preference', 'dietary_pref', 'dropdown', '', 'Lunch will be curated accordingly', 1, JSON.stringify(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain'])],
      ['T-Shirt Size', 'tshirt_size', 'dropdown', '', 'For conference kit', 0, JSON.stringify(['S', 'M', 'L', 'XL', 'XXL'])],
      ['Upload Photo ID Proof', 'id_proof', 'file_upload', '', 'Aadhaar / Passport / Student ID', 1, '[]']
    ]

    const insertField = db.prepare(`
      INSERT INTO custom_fields (id, event_id, field_label, field_name, field_type, placeholder, description, is_required, options, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    fields.forEach((f, i) => insertField.run(uuidv4(), eventId, f[0], f[1], f[2], f[3], f[4], f[5], f[6], i + 1))

    // Add Demo Attendee and Confirmed Registration
    const attendeeId = uuidv4()
    db.prepare(`
      INSERT INTO attendees (id, name, email, phone)
      VALUES (?, ?, ?, ?)
    `).run(attendeeId, 'Alex Morgan', 'alex.morgan@example.com', '+91 9876543210')

    const regId = uuidv4()
    const regNum = 'REG-SUMMIT-001'
    const firstTicket = db.prepare('SELECT id FROM ticket_types WHERE event_id = ? LIMIT 1').get(eventId) as any

    db.prepare(`
      INSERT INTO registrations (id, registration_number, event_id, attendee_id, ticket_type_id, status, custom_field_values)
      VALUES (?, ?, ?, ?, ?, 'confirmed', ?)
    `).run(regId, regNum, eventId, attendeeId, firstTicket?.id || null, JSON.stringify({
      full_name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+91 9876543210',
      organization: 'Tech Innovations Corp',
      dietary_pref: 'Vegetarian',
      tshirt_size: 'L'
    }))

    const payId = uuidv4()
    db.prepare(`
      INSERT INTO payments (id, registration_id, amount, currency, status, method, transaction_id)
      VALUES (?, ?, 999, 'INR', 'verified', 'upi', 'UPI-TXN-9847123984')
    `).run(payId, regId)

    // Generate QR ticket
    const ticketCode = 'TKT-SUMMIT-001'
    db.prepare(`
      INSERT INTO qr_tickets (id, ticket_code, registration_id, qr_data, qr_image_url, is_valid)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(
      uuidv4(),
      ticketCode,
      regId,
      JSON.stringify({ ticket_code: ticketCode, registration_number: regNum, attendee_name: 'Alex Morgan', event_name: 'Global AI & Web Innovation Summit 2026' }),
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TKT-SUMMIT-001'
    )
  }
}
