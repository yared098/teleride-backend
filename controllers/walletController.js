import { walletService } from "../services/walletService.js";

export const walletController = {
    async topUp(req, res) {
        try {
            const userId = req.user.userId;
            const { amount } = req.body;
            if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

            const result = await walletService.topUpWallet(userId, amount);
            res.json({ success: true, wallet: result.wallet, transaction: result.txn });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async pay(req, res) {
        try {
            const userId = req.user.userId;
            const { rideId, amount } = req.body;
            if (!rideId || !amount || amount <= 0) return res.status(400).json({ error: "Invalid input" });

            const result = await walletService.payForRide(userId, rideId, amount);
            res.json({ success: true, wallet: result.wallet, transaction: result.txn });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async tip(req, res) {
        try {
            const userId = req.user.userId;
            const { driverId, rideId, amount } = req.body;
            if (!driverId || !rideId || !amount || amount <= 0) return res.status(400).json({ error: "Invalid input" });

            const result = await walletService.tipDriver(userId, driverId, rideId, amount);
            res.json({ success: true, wallet: result.wallet, transaction: result.txn });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getMyWallet(req, res) {
        try {
            const userId = req.user.userId;
            const wallet = await walletService.getWalletByUser(userId);
            res.json({ success: true, wallet });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

};
