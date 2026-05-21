import { Router, Request, Response } from "express";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";

const router = Router();

// health check
router.get("/health", (req: Request, res: Response) => {
  sendSuccessResponse(res, 200, "OK", null);
});

router.post("/recommend", async (req: Request, res: Response) => {

});

export default router;
