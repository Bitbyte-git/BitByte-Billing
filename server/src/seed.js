import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import AuditLog from './models/AuditLog.js';
import Client from './models/Client.js';
import Invoice from './models/Invoice.js';
import Notification from './models/Notification.js';
import Payment from './models/Payment.js';
import Quotation from './models/Quotation.js';
import QuotationItem from './models/QuotationItem.js';
import Remark from './models/Remark.js';
import Service from './models/Service.js';
import User from './models/User.js';
import { connectDb } from './utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceNames = [
  ['Web Development', 'Premium web apps, portals, and integrations.', 85000],
  ['Personal Branding', 'Founder websites, social identity, and content kits.', 35000],
  ['Digital Marketing', 'Campaign strategy, funnels, SEO, and reporting.', 45000],
  ['Business Analytics', 'Dashboards, KPIs, data pipelines, and insights.', 70000],
  ['Imagination to Reality (R&D)', 'Prototype labs for unusual product ideas.', 120000],
  ['Real-Time Sales Data Driven Solutions', 'Sales intelligence, CRM automation, and live data.', 95000]
];

export async function seedData() {
  await Promise.all([
    User.deleteMany(),
    Client.deleteMany(),
    Service.deleteMany(),
    Quotation.deleteMany(),
    QuotationItem.deleteMany(),
    Invoice.deleteMany(),
    Payment.deleteMany(),
    Remark.deleteMany(),
    Notification.deleteMany(),
    AuditLog.deleteMany()
  ]);

  const [admin, accountant, clientUser] = await User.insertMany([
    { name: 'Aarav Mehta', email: 'admin@bitbytetech.com', phone: '9876500001', passwordHash: await bcrypt.hash('Admin@123', 12), role: 'Admin' },
    { name: 'Riya Sharma', email: 'accountant@bitbytetech.com', phone: '9876500002', passwordHash: await bcrypt.hash('Account@123', 12), role: 'Accountant' },
    { name: 'Nikhil Rao', email: 'client@demo.com', phone: '9876500003', passwordHash: await bcrypt.hash('Client@123', 12), role: 'Client' }
  ]);

  const services = await Service.insertMany(serviceNames.map(([name, description, basePrice]) => ({ name, description, basePrice })));
  const clients = await Client.insertMany([
    { clientId: 'BBT-CLI-0001', fullName: 'Nikhil Rao', companyName: 'Demo Retail Labs', email: 'client@demo.com', phone: '9876543210', gstin: '29ABCDE1234F1Z5', pan: 'ABCDE1234F', industry: 'Retail', registeredBy: admin._id },
    { clientId: 'BBT-CLI-0002', fullName: 'Meera Iyer', companyName: 'Northstar Fintech', email: 'meera@northstar.co', phone: '9012345678', gstin: '27AAECS1234F1Z2', pan: 'AAECS1234F', industry: 'Finance', registeredBy: admin._id },
    { clientId: 'BBT-CLI-0003', fullName: 'Kabir Khan', companyName: 'UrbanNest Realty', email: 'kabir@urbannest.in', phone: '9988776655', industry: 'Real Estate', registeredBy: admin._id },
    { clientId: 'BBT-CLI-0004', fullName: 'Ananya Sen', companyName: 'GreenKart Foods', email: 'ananya@greenkart.in', phone: '9123456789', gstin: '19ABCDE1234F1Z1', pan: 'ABCDE1234F', industry: 'Food Tech', registeredBy: admin._id },
    { clientId: 'BBT-CLI-0005', fullName: 'Dev Malhotra', companyName: 'SkillWave Academy', email: 'dev@skillwave.edu', phone: '9000011111', industry: 'Education', registeredBy: admin._id }
  ]);

  const statuses = ['Paid', 'Invoice Generated', 'Forwarded to Admin', 'Under Review', 'Needs Clarification', 'Approved', 'Submitted', 'Draft', 'Rejected', 'Invoice Generated'];
  const quotations = [];
  for (let i = 0; i < 10; i += 1) {
    const subtotal = i % 2 ? 90000 + i * 7000 : 0;
    const gstAmount = Math.round(subtotal * 0.18);
    quotations.push(await Quotation.create({
      quotationId: `BBT-QT-2026-${String(i + 1).padStart(4, '0')}`,
      createdBy: i % 5 === 0 ? clientUser._id : admin._id,
      clientId: clients[i % clients.length]._id,
      servicesSelected: [services[i % services.length]._id, services[(i + 2) % services.length]._id],
      projectTitle: ['Retail analytics portal', 'Investor dashboard', 'Brand launch kit', 'D2C storefront revamp', 'Learning platform MVP'][i % 5],
      projectDescription: 'A premium service request created as sample workflow data.',
      preferredStartDate: new Date('2026-06-01'),
      budgetRange: '₹1L - ₹3L',
      serviceRequirement: 'Workflow automation, reporting, and polished user experience.',
      technologyPreference: 'React, Node.js, MongoDB',
      priorityLevel: i % 3 === 0 ? 'High' : 'Medium',
      status: statuses[i],
      accountantRemarks: 'Costing reviewed by accountant.',
      adminRemarks: i % 2 ? 'Admin decision recorded.' : '',
      subtotal,
      gstAmount,
      totalAmount: subtotal + gstAmount,
      submittedAt: new Date(2026, 4, i + 1)
    }));
  }

  for (const quotation of quotations.slice(0, 6)) {
    if (quotation.subtotal > 0) {
      await QuotationItem.create({
        quotationId: quotation._id,
        serviceId: quotation.servicesSelected[0],
        description: 'Service-wise implementation package',
        estimatedCost: quotation.subtotal,
        gstPercentage: 18,
        total: quotation.totalAmount
      });
    }
  }

  const invoices = await Invoice.insertMany(quotations.slice(0, 5).map((quotation, index) => ({
    invoiceId: `BBT-INV-2026-${String(index + 1).padStart(4, '0')}`,
    quotationId: quotation._id,
    clientId: quotation.clientId,
    dueDate: new Date('2026-06-05'),
    items: [{ service: 'Service package', description: quotation.projectTitle, amount: quotation.subtotal || 50000, gstPercentage: 18, total: quotation.totalAmount || 59000 }],
    subtotal: quotation.subtotal || 50000,
    gstAmount: quotation.gstAmount || 9000,
    totalAmount: quotation.totalAmount || 59000,
    amountPaid: index === 0 ? (quotation.totalAmount || 59000) : 0,
    balanceDue: index === 0 ? 0 : (quotation.totalAmount || 59000),
    paymentStatus: index === 0 ? 'Paid' : 'Pending'
  })));

  await Payment.insertMany(invoices.map((invoice, index) => ({
    paymentId: `PAY-${String(index + 1).padStart(4, '0')}`,
    invoiceId: invoice._id,
    quotationId: invoice.quotationId,
    clientId: invoice.clientId,
    amount: index === 0 ? invoice.totalAmount : 0,
    paymentMethod: index === 0 ? 'Bank Transfer' : 'Pending',
    transactionReference: index === 0 ? 'UTR90012' : '-',
    status: index === 0 ? 'Paid' : 'Pending'
  })));

  await Notification.create({ userId: admin._id, title: 'Seed completed', message: 'Sample workflow data is ready.', type: 'System' });
  await AuditLog.create({ userId: admin._id, action: 'Database seeded', entityType: 'System', entityId: admin._id, newValue: { quotations: quotations.length } });

  console.log('Seed complete');
  console.log('Admin: admin@bitbytetech.com / Admin@123');
  console.log('Accountant: accountant@bitbytetech.com / Account@123');
  console.log('Client: client@demo.com / Client@123');
}

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed'));
if (isDirectRun) {
  connectDb()
    .then(() => seedData())
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error('Direct run seeding error:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}

