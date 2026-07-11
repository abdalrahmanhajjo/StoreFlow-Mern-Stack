import "dotenv/config";

import app from "./app";
import connectDB from "./config/db";
import { verifyMailer } from "./utils/auth.utils";

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Verify the SMTP connection up front so a bad credential or blocked port is
// visible at boot, not on the first user's registration.
verifyMailer();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});