import User from "../models/user.model.js";
import Wallet from "../models/wallet.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

const authService = {
  // Telegram login or auto-register
  async loginOrRegister(userData) {
    let user = await User.findOne({ telegramId: userData.telegramId });

    if (!user) {
      user = await User.create({
        telegramId: userData.telegramId,
        username: userData.username || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        role: "passenger",
        phoneNumber: userData.phoneNumber || "",
        vehicle: "",
        licensePlate: "",
        authSource: "telegram",
        deviceInfo: userData.deviceInfo || {},
      });

      // Create wallet for new Telegram user
      await Wallet.create({ user: user._id, balance: 0, currency: "ETB" });
    }

    // Generate JWT token
    const token = generateToken(user);
    user.token = token;
    await user.save();

    return { ok: true, user, token };
  },

  // Web/Mobile registration using email
  async register({ username, email, password, role, vehicle, licensePlate, authSource, deviceInfo }) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("Email already registered");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || "passenger",
      vehicle: vehicle || "",
      licensePlate: licensePlate || "",
      authSource: authSource || "web",
      deviceInfo: deviceInfo || {},
    });

    // Create wallet
    await Wallet.create({ user: newUser._id, balance: 10, currency: "ETB" });

    // Generate token and attach to user
    const token = generateToken(newUser);
    newUser.token = token;
    await newUser.save();

    // Auto-login: return user + token
    return { ok: true, message: "Registration successful", user: newUser, token };
  },

 async login({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const trimmedEmail = email.toString().trim().toLowerCase(); // ✅ safe even if not string
  const user = await User.findOne({ email: trimmedEmail }).select("+password");

  if (!user) throw new Error("User not found");

  if (!user.password) throw new Error("This account uses Telegram login only");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password");

  user.lastLogin = new Date();
  const token = generateToken(user);
  user.token = token;
  await user.save();

  return { ok: true, message: "Login successful", user, token };
}

};

export default authService;
