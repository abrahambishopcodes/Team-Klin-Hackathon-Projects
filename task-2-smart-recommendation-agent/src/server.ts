import "dotenv/config";
import express from "express";
import getEnv from "./utils/env";
import router from "./routes/index.route";

const app = express();

const PORT = getEnv("PORT");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});