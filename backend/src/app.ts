import express from "express";

const app = express();

app.use(express.json());
/*
app.use("/api/customers", customerRoutes); //mounts all customer-related routes under the /api/customers base path.
app.use(errorHandler); //this registers a global error-handling middleware

app.use("/api/authors", authorRoutes);
app.use("/api/publishers", publisherRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);*/
export default app;