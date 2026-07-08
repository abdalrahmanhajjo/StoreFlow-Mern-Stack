import { UserRole } from "../middleware/roleMiddleware";

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id?: string;
                name?: string;
                email?: string;
                role: UserRole;
            };
        }
    }
}

export { };