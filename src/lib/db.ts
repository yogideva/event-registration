import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const isServerless = !!(
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL ||
  process.env.NODE_ENV === 'production'
)

let dbInstance: any

export function getDb(): any {
  if (isServerless) {
    if (!dbInstance) {
      dbInstance = getMemoryDb()
    }
    return dbInstance
  }

  if (!dbInstance) {
    let DatabaseClass: any
    try {
      DatabaseClass = require('better-sqlite3')
      const DB_PATH = process.env.DATABASE_PATH || './data/eventplatform.db'
      const resolvedPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.resolve(process.cwd(), DB_PATH)
      const dataDir = path.dirname(resolvedPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      const nativeDb = new DatabaseClass(resolvedPath)
      nativeDb.pragma('journal_mode = WAL')
      nativeDb.pragma('foreign_keys = ON')
      initializeSchema(nativeDb)
      dbInstance = nativeDb
      return dbInstance
    } catch (err) {
      console.warn('better-sqlite3 not available, using in-memory store:', err)
      dbInstance = getMemoryDb()
    }
  }
  return dbInstance
}

function initializeSchema(db: any) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        avatar TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#6366f1',
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        description TEXT,
        about TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        poster TEXT,
        banner TEXT,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        venue_name TEXT,
        venue_address TEXT,
        maps_link TEXT,
        organizer_name TEXT,
        organizer_phone TEXT,
        organizer_email TEXT,
        registration_start TEXT,
        registration_end TEXT,
        max_participants INTEGER DEFAULT 0,
        is_free INTEGER DEFAULT 0,
        base_fee REAL DEFAULT 0,
        currency TEXT DEFAULT 'INR',
        terms TEXT,
        refund_policy TEXT,
        created_by TEXT REFERENCES admins(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS event_sections (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT,
        type TEXT NOT NULL DEFAULT 'text',
        media_url TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ticket_types (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        capacity INTEGER DEFAULT 0,
        sold_count INTEGER DEFAULT 0,
        color TEXT DEFAULT '#6366f1',
        start_date TEXT,
        end_date TEXT,
        benefits TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS custom_fields (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        placeholder TEXT,
        help_text TEXT,
        is_required INTEGER DEFAULT 0,
        default_value TEXT,
        options TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS attendees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        registration_number TEXT UNIQUE NOT NULL,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        ticket_type_id TEXT NOT NULL REFERENCES ticket_types(id),
        attendee_id TEXT REFERENCES attendees(id),
        attendee_name TEXT NOT NULL,
        attendee_email TEXT NOT NULL,
        attendee_phone TEXT,
        custom_data TEXT,
        payment_status TEXT DEFAULT 'pending',
        payment_amount REAL DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id),
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT NOT NULL,
        transaction_id TEXT,
        payment_proof_url TEXT,
        status TEXT DEFAULT 'pending',
        admin_notes TEXT,
        verified_by TEXT REFERENCES admins(id),
        verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS qr_tickets (
        id TEXT PRIMARY KEY,
        ticket_code TEXT UNIQUE NOT NULL,
        registration_id TEXT NOT NULL REFERENCES registrations(id),
        qr_data TEXT NOT NULL,
        qr_image_url TEXT,
        is_valid INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY,
        qr_ticket_id TEXT NOT NULL REFERENCES qr_tickets(id),
        registration_id TEXT NOT NULL REFERENCES registrations(id),
        event_id TEXT NOT NULL REFERENCES events(id),
        checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
        checked_in_by TEXT REFERENCES admins(id),
        staff_name TEXT,
        device_info TEXT,
        status TEXT DEFAULT 'success'
      );

      CREATE TABLE IF NOT EXISTS reschedules (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id),
        previous_date TEXT,
        new_date TEXT,
        previous_start_time TEXT,
        new_start_time TEXT,
        previous_venue TEXT,
        new_venue TEXT,
        reason TEXT,
        notified_at TEXT,
        created_by TEXT REFERENCES admins(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        event_id TEXT REFERENCES events(id),
        registration_id TEXT REFERENCES registrations(id),
        type TEXT NOT NULL,
        subject TEXT,
        message TEXT,
        channel TEXT DEFAULT 'email',
        status TEXT DEFAULT 'pending',
        sent_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT REFERENCES admins(id),
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sidebar_config (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        href TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 1,
        badge_key TEXT
      );
    `)

    const categoryCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as any).c
    if (categoryCount === 0) {
      const insertCat = db.prepare('INSERT INTO categories (id, name, slug, color, sort_order) VALUES (?, ?, ?, ?, ?)')
      const defaultCategories = [
        ['cat-1', 'Workshop', 'workshop', '#f59e0b', 1],
        ['cat-2', 'Seminar', 'seminar', '#3b82f6', 2],
        ['cat-3', 'Conference', 'conference', '#8b5cf6', 3],
        ['cat-4', 'Training', 'training', '#10b981', 4],
        ['cat-5', 'Meetup', 'meetup', '#f97316', 5],
        ['cat-6', 'Yoga', 'yoga', '#ec4899', 6],
        ['cat-7', 'Spiritual', 'spiritual', '#6366f1', 7],
        ['cat-8', 'Business', 'business', '#0ea5e9', 8],
        ['cat-9', 'Cultural', 'cultural', '#ef4444', 9],
      ]
      defaultCategories.forEach(cat => insertCat.run(...(cat as [string, string, string, string, number])))
    }

    const sidebarCount = (db.prepare('SELECT COUNT(*) as c FROM sidebar_config').get() as any).c
    if (sidebarCount === 0) {
      const insertSidebar = db.prepare('INSERT INTO sidebar_config (id, label, icon, href, sort_order, is_visible, badge_key) VALUES (?, ?, ?, ?, ?, ?, ?)')
      const sidebarItems: [string, string, string, string, number, number, string | null][] = [
        ['sb-1', 'Dashboard', 'LayoutDashboard', '/admin', 1, 1, null],
        ['sb-2', 'Events', 'CalendarDays', '/admin/events', 2, 1, null],
        ['sb-3', 'Create Event', 'PlusCircle', '/admin/events/create', 3, 1, null],
        ['sb-4', 'Registrations', 'Users', '/admin/registrations', 4, 1, null],
        ['sb-5', 'Payments', 'CreditCard', '/admin/payments', 5, 1, null],
        ['sb-6', 'QR Scanner', 'QrCode', '/admin/scanner', 6, 1, null],
        ['sb-7', 'Reports', 'BarChart3', '/admin/reports', 7, 1, null],
        ['sb-8', 'Settings', 'Settings', '/admin/settings', 8, 1, null],
      ]
      sidebarItems.forEach(item => insertSidebar.run(...item))
    }

    const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM settings').get() as any).c
    if (settingsCount === 0) {
      const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      const defaultSettings: [string, string][] = [
        ['org_name', 'EventPro'],
        ['org_logo', ''],
        ['org_description', 'Professional Event Management Platform'],
        ['org_email', 'admin@eventpro.com'],
        ['currency', 'INR'],
        ['currency_symbol', '₹'],
        ['primary_color', '#6366f1'],
        ['accent_color', '#f59e0b'],
        ['ticket_footer_text', 'Thank you for registering!'],
        ['confirmation_message', 'Your registration has been confirmed. See you at the event!'],
        ['payment_instructions', 'Please complete the payment via UPI and upload the screenshot for verification.'],
      ]
      defaultSettings.forEach(([k, v]) => insertSetting.run(k, v))
    }
  } catch (e) {
    console.warn('Schema init error:', e)
  }
}

let memoryDbInstance: any

function getMemoryDb() {
  if (memoryDbInstance) return memoryDbInstance

  const defaultCategories = [
    { id: 'cat-1', name: 'Workshop', slug: 'workshop', color: '#f59e0b', sort_order: 1 },
    { id: 'cat-2', name: 'Seminar', slug: 'seminar', color: '#3b82f6', sort_order: 2 },
    { id: 'cat-3', name: 'Conference', slug: 'conference', color: '#8b5cf6', sort_order: 3 },
    { id: 'cat-4', name: 'Training', slug: 'training', color: '#10b981', sort_order: 4 },
    { id: 'cat-5', name: 'Meetup', slug: 'meetup', color: '#f97316', sort_order: 5 },
    { id: 'cat-6', name: 'Yoga', slug: 'yoga', color: '#ec4899', sort_order: 6 },
    { id: 'cat-7', name: 'Spiritual', slug: 'spiritual', color: '#6366f1', sort_order: 7 },
    { id: 'cat-8', name: 'Business', slug: 'business', color: '#0ea5e9', sort_order: 8 },
    { id: 'cat-9', name: 'Cultural', slug: 'cultural', color: '#ef4444', sort_order: 9 },
  ]

  const defaultSidebar = [
    { id: 'sb-1', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin', sort_order: 1, is_visible: 1, badge_key: null },
    { id: 'sb-2', label: 'Events', icon: 'CalendarDays', href: '/admin/events', sort_order: 2, is_visible: 1, badge_key: null },
    { id: 'sb-3', label: 'Create Event', icon: 'PlusCircle', href: '/admin/events/create', sort_order: 3, is_visible: 1, badge_key: null },
    { id: 'sb-4', label: 'Registrations', icon: 'Users', href: '/admin/registrations', sort_order: 4, is_visible: 1, badge_key: null },
    { id: 'sb-5', label: 'Payments', icon: 'CreditCard', href: '/admin/payments', sort_order: 5, is_visible: 1, badge_key: null },
    { id: 'sb-6', label: 'QR Scanner', icon: 'QrCode', href: '/admin/scanner', sort_order: 6, is_visible: 1, badge_key: null },
    { id: 'sb-7', label: 'Reports', icon: 'BarChart3', href: '/admin/reports', sort_order: 7, is_visible: 1, badge_key: null },
    { id: 'sb-8', label: 'Settings', icon: 'Settings', href: '/admin/settings', sort_order: 8, is_visible: 1, badge_key: null },
  ]

  const defaultSettings = [
    { key: 'org_name', value: 'EventPro' },
    { key: 'org_logo', value: '' },
    { key: 'org_description', value: 'Professional Event Management Platform' },
    { key: 'org_email', value: 'admin@eventpro.com' },
    { key: 'currency', value: 'INR' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'primary_color', value: '#6366f1' },
    { key: 'accent_color', value: '#f59e0b' },
    { key: 'ticket_footer_text', value: 'Thank you for registering!' },
    { key: 'confirmation_message', value: 'Your registration has been confirmed. See you at the event!' },
    { key: 'payment_instructions', value: 'Please complete the payment via UPI and upload the screenshot for verification.' },
  ]

  const defaultEvents = [
    {
      id: 'demo-event-1',
      slug: 'global-ai-and-web-summit-2026',
      name: 'Global AI & Web Innovation Summit 2026',
      category_id: 'cat-3',
      category_name: 'Conference',
      category_color: '#8b5cf6',
      description: 'Join top engineers, entrepreneurs, and researchers for an immersive 2-day conference on Next-Gen Artificial Intelligence, Agents, and Cloud Architecture.',
      about: 'The Global AI & Web Innovation Summit 2026 brings together thought leaders, practitioners, and technology pioneers from around the world.',
      status: 'published',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80',
      date: '2026-11-15',
      start_time: '09:30',
      end_time: '18:00',
      venue_name: 'Silicon Valley Convention Center',
      venue_address: '150 Tech Park Boulevard, Silicon City, Bangalore, 560100',
      maps_link: 'https://maps.google.com',
      organizer_name: 'Innovation Guild International',
      organizer_phone: '+91 9876543210',
      organizer_email: 'summit@eventpro.com',
      registration_start: '2026-10-01',
      registration_end: '2026-11-14',
      max_participants: 500,
      is_free: 0,
      base_fee: 1499,
      currency: 'INR',
      terms: 'Attendees must present a valid digital QR ticket upon check-in.',
      refund_policy: 'Full refund if cancelled 7 days before the event.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  const defaultTickets = [
    { id: 'tkt-tier-1', event_id: 'demo-event-1', name: 'Early Bird Pass', description: 'Discounted all-access pass for early registrations', price: 999, capacity: 100, color: '#10b981', benefits: 'Access to all keynote stages\nConference swag kit\nLunch and refreshments', is_active: 1, sort_order: 1 },
    { id: 'tkt-tier-2', event_id: 'demo-event-1', name: 'Regular Admission', description: 'Standard full conference entry pass', price: 1499, capacity: 300, color: '#6366f1', benefits: 'Access to all tracks & breakout workshops\nNetworking lounge entry\nDigital certificate', is_active: 1, sort_order: 2 },
    { id: 'tkt-tier-3', event_id: 'demo-event-1', name: 'VIP Executive Pass', description: 'Premium all-inclusive pass with speaker lounge access', price: 2999, capacity: 50, color: '#f59e0b', benefits: 'Priority front-row seating\nExclusive VIP dinner & speakers dinner\nLifetime session recording recordings\n1-on-1 mentor booking slot', is_active: 1, sort_order: 3 },
    { id: 'tkt-tier-4', event_id: 'demo-event-1', name: 'Student Pass', description: 'Discounted ticket for university and college students', price: 499, capacity: 50, color: '#0ea5e9', benefits: 'Valid college student ID required\nFull track admission\nLunch included', is_active: 1, sort_order: 4 },
  ]

  const defaultSections = [
    { id: 'sec-1', event_id: 'demo-event-1', title: 'Conference Schedule & Agenda', content: 'Day 1:\n09:30 AM - Keynote: The Agentic Revolution\n11:00 AM - Panel: Next-Gen Web Applications\n01:00 PM - Networking Buffet Lunch\n02:30 PM - Deep Dive Workshop Tracks\n05:00 PM - Startup Pitch Showcase\n\nDay 2:\n10:00 AM - Scaling Distributed Systems\n01:00 PM - Closing Ceremony & Awards', type: 'text', sort_order: 1 },
    { id: 'sec-2', event_id: 'demo-event-1', title: 'Keynote Speakers', content: 'Featuring principal engineers and AI researchers from top tech laboratories, Fortune 500 tech architects, and unicorn founders sharing practical takeaways.', type: 'text', sort_order: 2 },
    { id: 'sec-3', event_id: 'demo-event-1', title: 'Important Instructions & What to Bring', content: '1. Bring your digital QR ticket saved on your mobile or printed.\n2. Laptops are encouraged for the hands-on workshop tracks.\n3. Government photo ID matching your registration name is required at gate check-in.', type: 'text', sort_order: 3 },
    { id: 'sec-4', event_id: 'demo-event-1', title: 'Frequently Asked Questions (FAQs)', content: 'Q: Can I transfer my ticket?\nA: Yes, ticket assignments can be edited in coordination with the organizer.\n\nQ: Is parking available?\nA: Free basement parking is available for all registered attendees.', type: 'text', sort_order: 4 },
  ]

  const defaultFields = [
    { id: 'fld-1', event_id: 'demo-event-1', label: 'Full Name', field_name: 'full_name', field_type: 'text', placeholder: 'Enter your full name', help_text: '', is_required: 1, options: '[]', sort_order: 1 },
    { id: 'fld-2', event_id: 'demo-event-1', label: 'Work Email', field_name: 'email', field_type: 'email', placeholder: 'name@company.com', help_text: 'Used for ticket delivery', is_required: 1, options: '[]', sort_order: 2 },
    { id: 'fld-3', event_id: 'demo-event-1', label: 'WhatsApp Number', field_name: 'phone', field_type: 'phone', placeholder: '+91 9876543210', help_text: 'For event day updates', is_required: 1, options: '[]', sort_order: 3 },
    { id: 'fld-4', event_id: 'demo-event-1', label: 'Company / College Name', field_name: 'organization', field_type: 'text', placeholder: 'Organization or University', help_text: '', is_required: 0, options: '[]', sort_order: 4 },
    { id: 'fld-5', event_id: 'demo-event-1', label: 'Job Title / Designation', field_name: 'job_title', field_type: 'text', placeholder: 'e.g. Senior Software Engineer', help_text: '', is_required: 0, options: '[]', sort_order: 5 },
    { id: 'fld-6', event_id: 'demo-event-1', label: 'Dietary Preference', field_name: 'dietary', field_type: 'dropdown', placeholder: 'Select preference', help_text: '', is_required: 0, options: '["Vegetarian", "Non-Vegetarian", "Vegan", "Jain"]', sort_order: 6 },
  ]

  const defaultRegistrations = [
    {
      id: 'reg-demo-001',
      registration_number: 'REG-SUMMIT-001',
      event_id: 'demo-event-1',
      ticket_type_id: 'tkt-tier-1',
      attendee_name: 'Alex Morgan',
      attendee_email: 'alex.morgan@techcorp.io',
      attendee_phone: '+91 9876543210',
      custom_data: JSON.stringify({ organization: 'TechCorp Labs', job_title: 'Staff Architect', dietary: 'Vegetarian' }),
      payment_status: 'verified',
      payment_amount: 999,
      payment_method: 'upi',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    }
  ]

  const defaultQrTickets = [
    {
      id: 'tkt-code-001',
      ticket_code: 'TKT-SUMMIT-001',
      registration_id: 'reg-demo-001',
      qr_data: JSON.stringify({ ticketCode: 'TKT-SUMMIT-001', regNumber: 'REG-SUMMIT-001', name: 'Alex Morgan', event: 'Global AI & Web Innovation Summit 2026' }),
      is_valid: 1,
      created_at: new Date().toISOString(),
    }
  ]

  const tables: Record<string, any[]> = {
    categories: defaultCategories,
    sidebar_config: defaultSidebar,
    settings: defaultSettings,
    events: defaultEvents,
    ticket_types: defaultTickets,
    event_sections: defaultSections,
    custom_fields: defaultFields,
    registrations: defaultRegistrations,
    payments: [],
    refunds: [],
    attendees: [
      { id: 'att-demo-001', name: 'Alex Morgan', email: 'alex.morgan@techcorp.io', phone: '+91 9876543210' }
    ],
    qr_tickets: defaultQrTickets,
    checkins: [],
    admins: [{ id: 'admin-system', email: 'admin@eventpro.com', name: 'Administrator', role: 'super_admin', password_hash: '' }],
    notifications: [],
    reschedules: [],
    audit_logs: [],
  }

  memoryDbInstance = {
    pragma: () => {},
    exec: () => {},
    prepare: (sql: string) => {
      const lower = sql.toLowerCase().trim()
      return {
        all: (...params: any[]) => {
          for (const tableName of Object.keys(tables)) {
            if (lower.includes(`from ${tableName}`) || lower.includes(`from  ${tableName}`)) {
              let rows = [...tables[tableName]]
              if (lower.includes('where is_visible = 1')) {
                rows = rows.filter(r => r.is_visible === 1)
              }
              if (lower.includes('where event_id = ?') && params.length > 0) {
                rows = rows.filter(r => r.event_id === params[0])
              }
              if (lower.includes('order by sort_order asc') || lower.includes('order by sort_order')) {
                rows.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              }
              if (lower.includes('count(*)')) {
                return [{ c: rows.length }]
              }
              return rows
            }
          }
          if (lower.includes('count(*)')) return [{ c: 0 }]
          return []
        },
        get: (...params: any[]) => {
          for (const tableName of Object.keys(tables)) {
            if (lower.includes(`from ${tableName}`) || lower.includes(`from  ${tableName}`)) {
              let rows = [...tables[tableName]]
              if (lower.includes('count(*)')) {
                return { c: rows.length }
              }
              if (lower.includes('max(')) {
                const maxVal = rows.reduce((max, r) => Math.max(max, r.sort_order || 0), 0)
                return { m: maxVal }
              }
              if (lower.includes('sum(')) {
                return { s: 0 }
              }
              if (lower.includes('where slug = ?') && params.length > 0) {
                return rows.find(r => r.slug === params[0]) || null
              }
              if ((lower.includes('where e.id = ? or e.slug = ?') || lower.includes('id = ? or slug = ?')) && params.length > 0) {
                return rows.find(r => r.id === params[0] || r.slug === params[0] || (params[1] && (r.id === params[1] || r.slug === params[1]))) || null
              }
              if (lower.includes('where id = ?') || lower.includes('where id=?')) {
                return rows.find(r => r.id === params[0]) || null
              }
              if (lower.includes('where email = ?') || lower.includes('where email=?')) {
                return rows.find(r => r.email === params[0]) || null
              }
              if (lower.includes('where key = ?') || lower.includes('where key=?')) {
                return rows.find(r => r.key === params[0]) || null
              }
              if (lower.includes('where registration_number = ?') || lower.includes('where registration_number=?')) {
                return rows.find(r => r.registration_number === params[0] || r.id === params[0]) || null
              }
              if (lower.includes('where registration_id = ?') || lower.includes('where registration_id=?')) {
                return rows.find(r => r.registration_id === params[0]) || null
              }
              if (lower.includes('where ticket_code = ?') || lower.includes('where ticket_code=?')) {
                return rows.find(r => r.ticket_code === params[0]) || null
              }
              return rows[0] || null
            }
          }
          if (lower.includes('count(*)')) return { c: 0 }
          if (lower.includes('sum(')) return { s: 0 }
          if (lower.includes('max(')) return { m: 0 }
          return null
        },
        run: (...params: any[]) => {
          for (const tableName of Object.keys(tables)) {
            if (lower.includes(`insert into ${tableName}`)) {
              if (tableName === 'settings' && params.length >= 2) {
                const existing = tables.settings.find(s => s.key === params[0])
                if (existing) {
                  existing.value = params[1]
                } else {
                  tables.settings.push({ key: params[0], value: params[1] })
                }
                return { changes: 1, lastInsertRowid: tables.settings.length }
              }
              if (tableName === 'admins') {
                const existing = tables.admins.find(a => a.email === params[1] || a.id === params[0])
                if (existing) {
                  if (params[2]) existing.password_hash = params[2]
                  return { changes: 1, lastInsertRowid: 1 }
                }
              }
              const record: any = { id: uuidv4(), created_at: new Date().toISOString() }
              if (params.length > 0) {
                params.forEach((val, idx) => { record[`col_${idx}`] = val })
                if (typeof params[0] === 'string') record.id = params[0]
              }
              tables[tableName].push(record)
              return { changes: 1, lastInsertRowid: tables[tableName].length }
            }
            if (lower.includes(`update ${tableName}`)) {
              if (tableName === 'admins' && lower.includes('password_hash')) {
                const newHash = params[0]
                const emailOrId = params[params.length - 1]
                const adm = tables.admins.find(a => a.email === emailOrId || a.id === emailOrId)
                if (adm) {
                  adm.password_hash = newHash
                } else if (tables.admins[0]) {
                  tables.admins[0].password_hash = newHash
                }
                return { changes: 1, lastInsertRowid: 1 }
              }
              return { changes: 1, lastInsertRowid: 1 }
            }
            if (lower.includes(`delete from ${tableName}`)) {
              return { changes: 1, lastInsertRowid: 1 }
            }
          }
          return { changes: 0, lastInsertRowid: 0 }
        }
      }
    }
  }

  return memoryDbInstance
}

export default getDb
