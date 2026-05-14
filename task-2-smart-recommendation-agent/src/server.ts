import "dotenv/config";
import express from "express";
import getEnv from "./utils/env";

const app = express();

const PORT = getEnv("PORT");

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});