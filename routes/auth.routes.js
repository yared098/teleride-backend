import express from "express";
import { telegramAuth, register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running ✅" });
});

// Telegram WebApp login/auto-register
router.post("/telegram", telegramAuth);

// Web/Mobile registration
router.post("/register", register);

// Web/Mobile login
router.post("/login", login);

export default router;
