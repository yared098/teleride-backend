import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import walletrout  from "./routes/wallet.routes.js";
import setupRideSocket from "./sockets/rideSocket.js";


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/wallet",walletrout);


const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

setupRideSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`🚘 TeleRide running on ${PORT}`));
connectDB();