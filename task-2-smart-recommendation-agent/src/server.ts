import "dotenv/config";
import express from "express";
import getEnv from "./utils/env";
import router from "./routes/index.route";

const app = express();

const PORT = getEnv("PORT");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// health check
app.get("/health", (req, res) => {
    res.json({
        message: "OK",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});