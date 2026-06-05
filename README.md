MONGODB_URI=mongodb://127.0.0.1:27017/bbt_billing# Bit Byte Technologies Billing & Quotation Management System

Premium role-based SaaS platform for client quotation requests, accountant costing, admin approvals, invoice generation, payment tracking, reporting, notifications, and audit logs.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Framer Motion, Recharts, Lucide React
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Nodemailer, pdfmake-ready invoice endpoint

## Run locally

```bash
npm install
cp server/.env.example server/.env
npm run seed
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000/api/health`

## Email delivery on Render

Render free web services block outbound SMTP ports `25`, `465`, and `587`. For production on Render, use an HTTPS email provider instead of SMTP:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=Bit Byte Technologies <billing@your-verified-domain.com>
```

When `RESEND_API_KEY` is set, the server sends all notification and invoice emails through Resend over HTTPS. If it is not set, the server falls back to SMTP using `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, and `MAIL_FROM`.

## Demo users

- Admin: `admin@bitbytetech.com` / `Admin@123`
- Accountant: `accountant@bitbytetech.com` / `Account@123`
- Client: `client@demo.com` / `Client@123`

## Project structure

```text
client/      React dashboard application
server/      Express API, Mongoose models, routes, workflow services
Main.html    Existing standalone file kept untouched
```
