import { Router, Request, Response } from "express";
import { index } from "../config/pinecone.config";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";
import voyage from "../config/voyage.config";

const router = Router();

// health check
router.get("/health", (req: Request, res: Response) => {
    sendSuccessResponse(res, 200, "OK", null);
});

router.post("/recommend", async (req: Request, res: Response) => {
    const {user_query} = req.body;

    const embeddingResponse = await voyage.embed({
        model: "voyage-4-lite",
        input: user_query,
        inputType: "query"
    });

    const vector = embeddingResponse?.data?.[0]?.embedding;

    if (!vector) {
        throw new Error("Failed to generate embedding")
    }
 
    const productsRecommendations = await index.searchRecords({
        query: {
            vector: { values: vector },
            topK: 10,
        },
        namespace: "task2_items"
    })

    sendSuccessResponse(res, 200, "Recommendations fetched successfully", {
        // vector,
        recommendations: productsRecommendations
    });

})

export default router;