import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL)
const DB_PATH = process.env.DATABASE_PATH || (isServerless ? '/tmp/eventplatform.db' : './data/eventplatform.db')
const resolvedPath = path.isAbsolute(DB_PATH) ? DB_PATH : path.resolve(process.cwd(), DB_PATH)

const dataDir = path.dirname(resolvedPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(resolvedPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
  }
  return db
}

function initializeSchema(db: Database.Database) {
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
      category_id TEXT REFERENCES categories(id),
      description TEXT,
      about TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      poster TEXT,
      banner TEXT,
      logo TEXT,
      organizer_logo TEXT,
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
      max_participants INTEGER,
      is_free INTEGER DEFAULT 0,
      base_fee REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      terms TEXT,
      refund_policy TEXT,
      cancellation_reason TEXT,
      cancelled_at TEXT,
      created_by TEXT REFERENCES admins(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_media (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_sections (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'text',
      image_url TEXT,
      video_url TEXT,
      document_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_types (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      capacity INTEGER,
      registration_start TEXT,
      registration_end TEXT,
      benefits TEXT,
      color TEXT DEFAULT '#6366f1',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT NOT NULL,
      description TEXT,
      placeholder TEXT,
      is_required INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      default_value TEXT,
      options TEXT,
      sort_order INTEGER DEFAULT 0,
      section TEXT DEFAULT 'registration',
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
      event_id TEXT NOT NULL REFERENCES events(id),
      attendee_id TEXT NOT NULL REFERENCES attendees(id),
      ticket_type_id TEXT REFERENCES ticket_types(id),
      status TEXT NOT NULL DEFAULT 'pending',
      custom_field_values TEXT DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL REFERENCES registrations(id),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      upi_id TEXT,
      transaction_id TEXT,
      payment_proof TEXT,
      gateway TEXT,
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      notes TEXT,
      verified_by TEXT REFERENCES admins(id),
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id),
      registration_id TEXT NOT NULL REFERENCES registrations(id),
      amount REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      processed_by TEXT REFERENCES admins(id),
      processed_at TEXT,
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
      ['org_phone', ''],
      ['org_website', ''],
      ['org_address', ''],
      ['currency', 'INR'],
      ['currency_symbol', '₹'],
      ['primary_color', '#6366f1'],
      ['accent_color', '#f59e0b'],
      ['ticket_footer_text', 'Thank you for registering!'],
      ['confirmation_message', 'Your registration has been confirmed. See you at the event!'],
      ['payment_instructions', 'Please complete the payment via UPI and upload the screenshot for verification.'],
      ['upi_id', ''],
      ['upi_qr_image', ''],
      ['timezone', 'Asia/Kolkata'],
      ['date_format', 'DD/MM/YYYY'],
      ['footer_text', ''],
      ['privacy_policy', ''],
      ['terms_conditions', ''],
      ['refund_policy', ''],
      ['smtp_configured', '0'],
      ['social_facebook', ''],
      ['social_instagram', ''],
      ['social_twitter', ''],
      ['social_youtube', ''],
      ['social_telegram', ''],
      ['social_whatsapp', ''],
    ]
    defaultSettings.forEach(([k, v]) => insertSetting.run(k, v))
  }
}

export default getDb
