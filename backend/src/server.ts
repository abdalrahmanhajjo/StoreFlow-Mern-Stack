import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import categoryRoutes from "./routes/categoryRoutes";
import productRoutes from "./routes/productRoutes";
import customerRoutes from "./routes/customerRoutes";
import loyaltyLedgerRoutes from "./routes/loyaltyLedgerRoutes";
import saleRoutes from "./routes/saleRoutes";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes";
dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.send("StoreFlow API is running");
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty-ledger", loyaltyLedgerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);


app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});