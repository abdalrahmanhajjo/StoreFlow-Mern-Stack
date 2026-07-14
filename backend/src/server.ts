import "dotenv/config";

import app from "./app";
import connectDB from "./config/db";
import { validateEnv } from "./config/validateEnv";
import { verifyMailer } from "./utils/auth.utils";
import { startBillingScheduler } from "./services/billing/scheduler";

// Fail fast on a misconfigured environment (missing MONGO_URI, JWT secret, …).
validateEnv();

const PORT = process.env.PORT || 5000;

// Connect to database, then verify the mail transport, then listen.
connectDB();
verifyMailer();
startBillingScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Last-resort safety nets. An unhandled rejection or thrown error should be
// logged (not swallowed); on a truly uncaught exception we exit so the host
// (Render/Railway/…) restarts a clean process rather than limping along.
process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception:", err);
  process.exit(1);
});
