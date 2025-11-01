import authService from "../services/authService.js";
import { verifyTelegramAuth } from "../utils/verifyTelegram.js";

export const telegramAuth = async (req, res) => {
  try {
    const { initData } = req.body;

    const isValid = verifyTelegramAuth(initData, process.env.BOT_TOKEN);
    if (!isValid) return res.status(401).json({ message: "Invalid Telegram auth" });

    const data = Object.fromEntries(new URLSearchParams(initData));
    const userData = {
      telegramId: data.id,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      photoUrl: data.photo_url,
    };

    const { user, token } = await authService.loginOrRegister(userData);
    res.json({ ok: true, user, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Web Registration
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "All fields required" });
    }

    const result = await authService.register({ username, email, password });
    res.status(201).json(result);

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ ok: false, message: "Server Error" });
  }
};

// ✅ Web Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password required" });
    }

    const result = await authService.login(email, password);
    res.status(200).json(result);

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ ok: false, message: "Server Error" });
  }
};