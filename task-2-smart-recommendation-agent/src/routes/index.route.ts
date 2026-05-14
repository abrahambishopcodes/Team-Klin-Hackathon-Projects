import { Router, Request, Response } from "express";
import { index } from "../config/pinecone.config";

const router = Router();

router.post("/recommend", async (req: Request, res: Response) => {
    const {persona_text} = req.body;

    const pcQueryResults = await index.searchRecords({
        query: {
            inputs: persona_text,
            topK: 20,
        },
        
    })

})

export default router;