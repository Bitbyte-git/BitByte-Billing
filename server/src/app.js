import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/client.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import reportRoutes from "./routes/report.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", app: "Bit Byte Technologies Billing API" }),
);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(errorHandler);

export default app;
