# EventPro — Fully Customizable Event Creation & Registration Platform

A full-stack, enterprise-grade Event Creation and Registration web application built with **Next.js 15 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**, and **SQLite (better-sqlite3)**.

---

## 🌟 Core Philosophy: Zero Hardcoding & Complete Customizability

**Nothing on the administrator side is hardcoded or permanently restricted.** 

Every event name, category, question, ticket type, payment gateway, content section, image, policy, and branding attribute is fully dynamic and editable by the administrator. Predefined choices are provided strictly as **convenient suggestions** alongside prominent **`+ Add Custom`** options throughout the entire application.

---

## 🚀 Key Features

### 1. 🛡️ Secure Admin Dashboard
- **Real-Time KPIs**: Total events, confirmed attendees, pending payment submissions, net revenue, check-in count, and available seats.
- **Customizable Sidebar Navigation**: Add, rename, hide/unhide, and reorder navigation items directly from Admin Settings.
- **Recent Activity**: Quick view of latest registrations and upcoming scheduled events.

### 2. 🎪 Dynamic Event Creation
- **Event Name**: Any text input — never locked to preset templates.
- **Dynamic Categories**: Suggested categories (*Workshop, Seminar, Conference, Training, Meetup, Yoga, Spiritual, Business, Cultural*) plus an inline **`+ Add Custom Category`** builder with custom color tagging and deletion controls.
- **Comprehensive Details**: Date, start/end time, venue name, venue address, Google Maps link, organizer contact info, registration opening/closing dates, participant limits, base fees, currency selector, terms, and cancellation policies.

### 3. 📝 Dynamic Registration Form Builder
- Admin can customize the attendee registration form with **14 field types**:
  - `Text`, `Long Text`, `Number`, `Email`, `Phone`, `Date`, `Time`
  - `Dropdown` (custom options list)
  - `Multiple Choice` (radio options)
  - `Checkbox` (single or multi-select options)
  - `File Upload` & `Image Upload` (with base64 encoding & server persistence)
  - `URL` & `Address`
- Quick-add suggested presets (*Full Name, WhatsApp Number, Email, Gender, Age, City, Company, Dietary Preference, ID Proof*).
- Define labels, placeholders, helper text, order, and mandatory (`*required`) status.
- Dynamically rendered and validated on the public registration page.

### 4. 🎟️ Flexible Tickets & Pricing
- Create unlimited custom ticket types (e.g. *Early Bird, Regular Entry, VIP Pass, Student Pass, Free Registration*).
- Configure name, price, capacity limits, registration windows, color tags, active/inactive visibility, and bulleted benefits.

### 5. 📑 Custom Event Content Sections
- Add arbitrary content sections to the public page (e.g. *About, Agenda, Keynote Speakers, Instructors, Highlights, Instructions, What to Bring, FAQs, Contact Support*).
- Rich types: **Text Content**, **Image Gallery**, **Video Embeds (YouTube/Vimeo)**, and **Supporting Documents / PDFs**.
- Reorder sections up and down with instant position updates.

### 6. 💳 Payment Configuration & Proof Verification
- **Configurable UPI / QR / Gateways**: Enter organizer UPI ID, upload a payment QR code image, set instructions, and define currency.
- **Proof-Based Verification**: Attendees can submit their 12-digit UTR / Transaction ID and upload screenshot proof.
- **Admin Approval Queue**: Admin reviews submitted payment proofs with one-click **"Verify"** (which confirms registration and issues the QR ticket) or **"Reject"**.

### 7. 📱 Unique QR Ticket & Venue Scanner
- **Dynamic QR Generation**: Verified and free registrations automatically generate a unique QR code containing encrypted ticket metadata.
- **Printable Digital Ticket**: Styled ticket card featuring event branding, attendee info, venue directions, Google Maps link, and browser print styling.
- **Staff Venue Scanner**:
  - Web camera scanning using HTML5 camera stream (`getUserMedia`).
  - Handheld USB barcode/QR scanner gun support (instant keyboard-wedge entry).
  - Validates ticket authenticity and payment status.
  - **Duplicate Check-in Prevention**: Logs timestamp, scanning gate/staff name, and prevents reuse.

### 8. 🔄 Event Rescheduling & Cancellation
- **Reschedule Management**: Change date, time, and venue with an audit log stored in `reschedules`. Automatically creates notification logs for all registered attendees.
- **Cancellation Workflow**: Cancel an entire event with a stated reason, notifying attendees and triggering refund status tracking.

### 9. 📊 Registration Management & Reports
- **Registrations Table**: Search by attendee name, email, phone, or registration number. Filter by event and status (*Pending, Confirmed, Cancelled, Waitlisted*).
- **Sort & Export**: Sort by date, name, or amount. One-click CSV export.
- **Refund Management**: Initiate attendee refunds with custom reason tracking.
- **Resend Confirmation**: Re-trigger confirmation notifications at any time.
- **Reports Page**: Breakdown of ticket sales, revenue by tier, and printable event summary reports.

### 10. 🎨 Customizable Organization Settings
- Organization profile (Name, Logo upload, Description, Email, Phone, Website, Address).
- Branding colors (Primary and Accent pickers).
- Confirmation & ticket messages, default policy templates (Terms, Privacy, Refund), and social media link configuration.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Styling**: React 18, [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) icons
- **Database**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) with Write-Ahead Logging (WAL) mode
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (JWT session, bcrypt password hashing)
- **QR Generation**: [`qrcode`](https://www.npmjs.com/package/qrcode)

---

## 📂 Project Structure

```
├── public/
│   └── uploads/                  # Uploaded posters, banners, logos, QR images & proofs
├── data/
│   └── eventplatform.db          # SQLite database (auto-created on first run)
├── src/
│   ├── app/
│   │   ├── admin/                # Admin portal
│   │   │   ├── events/           # Events list & creation/edit wizard
│   │   │   ├── registrations/    # Registration management & export
│   │   │   ├── payments/         # Payment verification queue
│   │   │   ├── scanner/          # QR scanner & check-in
│   │   │   ├── reports/          # Analytics & reporting
│   │   │   ├── settings/         # Organization & platform configuration
│   │   │   └── login/            # Admin authentication
│   │   ├── api/                  # REST API Route Handlers
│   │   │   ├── events/           # Events CRUD, tickets, sections, fields, reschedule
│   │   │   ├── registrations/    # Registration submission & status updates
│   │   │   ├── payments/         # Proof upload, verification & refunds
│   │   │   ├── scanner/          # QR verification & gate check-ins
│   │   │   └── ticket/           # Public ticket lookup
│   │   └── event/[slug]/         # Public event landing page
│   │       ├── register/         # Dynamic ticket selector & custom form builder
│   │       └── ticket/[id]/      # Attendee digital QR ticket
│   └── lib/
│       ├── db.ts                 # SQLite connection & schema initialization
│       ├── auth.ts               # NextAuth credential provider
│       ├── qr.ts                 # QR generation helper
│       ├── seed.ts               # Demo data seeder
│       └── utils.ts              # Formatting & helper utilities
├── .env.example                  # Environment variable reference
└── .env.local                    # Active configuration
```

---

## ⚡ Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env.local` (already preconfigured for local development):
```env
NEXTAUTH_SECRET=your-random-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@eventpro.com
ADMIN_PASSWORD=your-secure-admin-password
DATABASE_PATH=./data/eventplatform.db
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE_MB=10
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EventPro
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Or Run the Production Server
```bash
npm run build
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Admin Credentials

- **URL**: `http://localhost:3000/admin/login`
- **Email**: `admin@eventpro.com`
- **Password**: configured via `ADMIN_PASSWORD` (default: `admin123`)

*(You can change credentials and customize your organization profile anytime in **Admin → Settings**)*

---

## 🌐 Demonstration Showcase

A pre-seeded demonstration event is included:
- **Public URL**: `http://localhost:3000/event/global-ai-and-web-summit-2026`
- **Registration Form**: `http://localhost:3000/event/global-ai-and-web-summit-2026/register`
- **Sample Verified Ticket**: `http://localhost:3000/event/global-ai-and-web-summit-2026/ticket/REG-SUMMIT-001`
- **Ticket Code for QR Scanner Test**: `TKT-SUMMIT-001`

---

## 🚀 Deploying to GitHub & Netlify

### Step 1: Upload to GitHub

#### Option A: Using Git CLI (Command Line)
1. If Git is installed on your computer, open PowerShell or Command Prompt in the project folder (`c:\Users\ELCOT\Downloads\registration`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: EventPro platform"
   git branch -M main
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

#### Option B: Using GitHub Desktop
1. Open [GitHub Desktop](https://desktop.github.com/).
2. Click **File → Add Local Repository...**
3. Select `c:\Users\ELCOT\Downloads\registration`.
4. If prompted to create a repository, click **Create Repository**.
5. Click **Publish repository** to push it to your GitHub account.

---

### Step 2: Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/) and log in.
2. Click **Add new site → Import an existing project**.
3. Select **GitHub** and authorize access to your repository.
4. Netlify will automatically detect settings from [`netlify.toml`](file:///c:/Users/ELCOT/Downloads/registration/netlify.toml):
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Click **Add environment variables** and configure:
   - `NEXTAUTH_SECRET`: `your-random-secret-key-min-32-chars`
   - `NEXTAUTH_URL`: `https://<your-netlify-site-name>.netlify.app`
   - `ADMIN_EMAIL`: `admin@eventpro.com`
   - `ADMIN_PASSWORD`: `your-secure-admin-password`
6. Click **Deploy EventPro**. Netlify will build and host your application with live public URLs.
