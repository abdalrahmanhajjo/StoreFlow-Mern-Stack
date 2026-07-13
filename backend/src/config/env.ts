/** Case/whitespace-tolerant production check, so `Production`, `PRODUCTION`,
 * ` production ` all count — a common deploy footgun otherwise. */
export const isProduction = (): boolean =>
    (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
