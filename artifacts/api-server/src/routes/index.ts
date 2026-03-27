import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import opportunitiesRouter from "./opportunities.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/opportunities", opportunitiesRouter);

export default router;
