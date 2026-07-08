export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const calculateLoyaltyTier = (
    lifetimePointsEarned: number
): LoyaltyTier => {
    if (lifetimePointsEarned >= 1000) {
        return "Platinum";
    }

    if (lifetimePointsEarned >= 500) {
        return "Gold";
    }

    if (lifetimePointsEarned >= 100) {
        return "Silver";
    }

    return "Bronze";
};