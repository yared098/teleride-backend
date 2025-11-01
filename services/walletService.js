// services/walletService.js
import Wallet from "../models/wallet.model.js";
import Transaction from "../models/transaction.model.js"; // optional, if you track transactions

export const walletService = {
  async topUpWallet(userId, amount) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new Error("Wallet not found");

    wallet.balance += amount;

    // Optional: record transaction
    const txn = await Transaction.create({
      user: userId,
      type: "topup",
      amount,
      balanceAfter: wallet.balance,
    });

    await wallet.save();
    return { wallet, txn };
  },

  async payForRide(userId, rideId, amount) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    wallet.balance -= amount;

    const txn = await Transaction.create({
      user: userId,
      ride: rideId,
      type: "payment",
      amount,
      balanceAfter: wallet.balance,
    });

    await wallet.save();
    return { wallet, txn };
  },

  async tipDriver(driverId, rideId, amount) {
    const driverWallet = await Wallet.findOne({ user: driverId });
    if (!driverWallet) throw new Error("Driver wallet not found");

    driverWallet.balance += amount;

    const txn = await Transaction.create({
      user: driverId,
      ride: rideId,
      type: "tip",
      amount,
      balanceAfter: driverWallet.balance,
    });

    await driverWallet.save();
    return { wallet: driverWallet, txn };
  },
};
