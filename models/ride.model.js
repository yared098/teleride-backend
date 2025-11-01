import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  from: {
    address: String,
    lat: Number,
    lng: Number,
  },
  to: {
    address: String,
    lat: Number,
    lng: Number,
  },
  distanceKm: Number,
  fare: Number,
  status: {
    type: String,
    enum: ["requested", "accepted", "in_progress", "completed", "cancelled"],
    default: "requested",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  startedAt: Date,
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model("Ride", rideSchema);
