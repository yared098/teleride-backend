import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
  type: { type: String, enum: ["topup", "ride_payment", "tip"], required: true },
  amount: { type: Number, required: true },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" }, // optional for ride payments
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
}, { timestamps: true });

export default mongoose.model("Transaction", transactionSchema);
