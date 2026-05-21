import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import getEnv from "./utils/env";
import router from "./routes/index.route";
import AppError from "./utils/AppError";

const app = express();

const PORT = getEnv("PORT");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// global error handler
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal server error";
    
    return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        isOperational: err.isOperational,
    });
});