import jwt from "jsonwebtoken";

export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = payload; // e.g., { id, telegramId, role }
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}
