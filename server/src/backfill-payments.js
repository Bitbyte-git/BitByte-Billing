/**
 * Backfill script: for every Invoice that has no Payment record yet,
 * create a Pending payment so it appears in Payments Management.
 *
 * Run once:  node src/backfill-payments.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDb } from './utils/db.js';
import Invoice from './models/Invoice.js';
import Payment from './models/Payment.js';
import { nextPaymentId } from './utils/idGenerator.js';

async function run() {
  await connectDb();

  const invoices = await Invoice.find({});
  console.log(`Found ${invoices.length} invoice(s).`);

  let created = 0;
  for (const invoice of invoices) {
    const exists = await Payment.findOne({ invoiceId: invoice._id });
    if (!exists) {
      const paymentId = await nextPaymentId();
      await Payment.create({
        paymentId,
        invoiceId: invoice._id,
        quotationId: invoice.quotationId,
        clientId: invoice.clientId,
        amount: invoice.amountPaid || 0,
        paymentMethod: 'Pending',
        status: invoice.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
      });
      console.log(`  Created ${paymentId} for invoice ${invoice.invoiceId}`);
      created++;
    } else {
      console.log(`  Skipped ${invoice.invoiceId} — payment already exists (${exists.paymentId})`);
    }
  }

  console.log(`\nDone. ${created} payment record(s) created.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
