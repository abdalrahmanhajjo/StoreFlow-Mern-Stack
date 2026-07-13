import mongoose from "mongoose";

/** Normalise a pasted connection string: trim whitespace, drop wrapping
 * quotes, and collapse accidental line breaks a long paste can introduce. */
function cleanUri(raw: string | undefined): string {
    if (!raw) return "";
    let uri = raw.trim();
    if (
        (uri.startsWith('"') && uri.endsWith('"')) ||
        (uri.startsWith("'") && uri.endsWith("'"))
    ) {
        uri = uri.slice(1, -1).trim();
    }
    // A wrapped paste can inject newlines/carriage returns mid-string.
    return uri.replace(/[\r\n]+/g, "");
}

const connectDB = async (): Promise<void> => {
    const uri = cleanUri(process.env.MONGO_URI);

    if (!uri) {
        console.error(
            "\n[db] MONGO_URI is not set. Add it to backend/.env, e.g.\n" +
            "     MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/storeflow\n"
        );
        process.exit(1);
    }

    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
        console.error(
            "\n[db] MONGO_URI is malformed — it must be a single line starting with\n" +
            '     "mongodb://" or "mongodb+srv://". Check backend/.env for a broken\n' +
            "     paste (line breaks, stray quotes, or a leading space).\n"
        );
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
        console.log("MongoDB connected");
    } catch (error) {
        const msg = (error as Error).message || String(error);
        console.error(`\n[db] Could not connect to MongoDB: ${msg}`);
        if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
            console.error(
                "     This looks like a DNS/network problem reaching the cluster.\n" +
                "     • If using a mongodb+srv:// URI, your network may block SRV lookups —\n" +
                "       switch to the standard (non-srv) mongodb:// connection string.\n" +
                "     • Make sure your current IP is allowed in Atlas → Network Access.\n"
            );
        }
        process.exit(1);
    }
};

export default connectDB;
