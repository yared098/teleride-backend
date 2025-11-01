// routes/walletRoutes.js
import express from "express";
import { walletController } from "../controllers/walletController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/topup", verifyToken, walletController.topUp);
router.post("/pay", verifyToken, walletController.pay);
router.post("/tip", verifyToken, walletController.tip);
router.get("/me", verifyToken, walletController.getMyWallet);


export default router;
