import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      unique: true,
      sparse: true, // allows undefined or null if not Telegram user
      default: undefined, // important to avoid duplicate nulls
    },
    username: { type: String, required: true },
    firstName: String,
    lastName: String,

    // 🔐 For Web/Mobile registration
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // allows undefined for Telegram users
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // optional for Telegram users
    },
    password: {
      type: String,
      select: false, // don’t return password by default
    },

    // 👤 User roles
    role: {
      type: String,
      enum: ["passenger", "driver", "admin"],
      default: "passenger",
    },

    // 🚗 Driver-specific fields
    vehicle: {
      type: String,
      default: "",
    },
    licensePlate: {
      type: String,
      default: "",
    },

    // 📍 Location tracking
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },

    // ⭐ Rating system
    rating: {
      type: Number,
      default: 5.0,
    },

    // ✅ User status
    active: {
      type: Boolean,
      default: true,
    },

    // ⚙️ Connection details (for sockets)
    socketId: {
      type: String,
      default: null,
    },

    // 🧭 Metadata
    authSource: {
      type: String,
      enum: ["telegram", "web", "mobile"],
      required: true,
      default: "web", // fallback
    },
    deviceInfo: {
      type: Object,
      default: {},
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
