import { Router, Request, Response } from "express";
import { index } from "../config/pinecone.config";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";
import voyage from "../config/voyage.config";
import prisma from "../lib/prisma.lib";
import openaiClient from "../config/openai.config";
import getEnv from "../utils/env";
import { generateQuery } from "../utils/aiHelpers";

const router = Router();

// health check
router.get("/health", (req: Request, res: Response) => {
    sendSuccessResponse(res, 200, "OK", null);
});

router.post("/recommend", async (req: Request, res: Response) => {
    const {user_query, user_id} = req.body;

    // Fetch user from database
    const user = await prisma.user.findUnique({
        where: {
            user_id
        }
    })

    if (user_id && !user) {
        throw new Error("User not found")
    }

    // use the llm to generate a query based on the user's query and their profile
    const generatedQuery = await generateQuery(user?.persona_summary as string, user_query)

    if (!generatedQuery) {
        throw new Error("Failed to generate query")
    }

    // embedded the user query
    const embeddingResponse = await voyage.embed({
        model: "voyage-4-lite",
        input: generatedQuery,
        inputType: "query"
    });

    const vector = embeddingResponse?.data?.[0]?.embedding;

    if (!vector) {
        throw new Error("Failed to generate embedding")
    }
 
    // used the vector to query the pinecone index
    const productsRecommendations = await index.searchRecords({
        query: {
            vector: { values: vector },
            topK: 10,
        },
        namespace: "task2_items"
    })

    sendSuccessResponse(res, 200, "Recommendations fetched successfully", {
        generatedQuery,
        recommendations: productsRecommendations,
        user
    });

})

export default router;