import { Router, Request, Response } from "express";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";
import { generateColdUserPersonaController, getAllDemoUsers, recommendProductsController } from "../controllers/index.controller";

const router = Router();

// health check
router.get("/health", (req: Request, res: Response) => {
  sendSuccessResponse(res, 200, "OK", null);
});

router.post("/recommend", recommendProductsController);

router.post("/generate-user-persona", generateColdUserPersonaController);

router.get("/demo-users", getAllDemoUsers)

export default router;
