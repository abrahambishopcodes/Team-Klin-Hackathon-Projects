import { Router, Request, Response } from "express";
import { index } from "../config/pinecone.config";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";

const router = Router();

// health check
router.get("/health", (req: Request, res: Response) => {
    sendSuccessResponse(res, 200, "OK", null);
});

router.post("/recommend", async (req: Request, res: Response) => {
    const {persona_text} = req.body;

    const pcQueryResults = await index.searchRecords({
        query: {
            inputs: {
                text: persona_text
            },
            topK: 5,
        },
        
    })

    sendSuccessResponse(res, 200, "Recommendations fetched successfully", {
        queryResults: pcQueryResults,

    });

})

export default router;