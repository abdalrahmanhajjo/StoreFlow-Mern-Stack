import { isProduction } from "./env";
/**
 * Fail fast with a clear message if the environment is misconfigured, instead
 * of crashing cryptically on the first request. Run once at boot.
 */
export function validateEnv(): void {
    const isProd = isProduction();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!process.env.MONGO_URI) {
        errors.push("MONGO_URI is required (your MongoDB/Atlas connection string).");
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        errors.push("JWT_ACCESS_SECRET is required (a long random string).");
    } else if (secret.length < 16) {
        (isProd ? errors : warnings).push(
            "JWT_ACCESS_SECRET is short — use at least 32 random characters."
        );
    } else if (secret === "change-me" || secret === "dev-only-change-me") {
        (isProd ? errors : warnings).push(
            "JWT_ACCESS_SECRET is a placeholder — set a real secret."
        );
    }

    if (isProd && !process.env.CLIENT_APP_URL) {
        errors.push(
            "CLIENT_APP_URL is required in production (your frontend's URL, for CORS and email links)."
        );
    }

    if (isProd && (!process.env.BREVO_API_KEY || !(process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER))) {
        warnings.push(
            "BREVO_API_KEY / sender not set — verification & reset codes will print to the log instead of sending. " +
            "(Email uses Brevo's HTTPS API; SMTP is blocked on most free hosts.)"
        );
    }

    for (const w of warnings) console.warn(`[env] warning: ${w}`);

    if (errors.length) {
        console.error("\n[env] Cannot start — fix these in your environment:");
        for (const e of errors) console.error(`  • ${e}`);
        console.error("");
        process.exit(1);
    }
}
