import { io } from "socket.io-client";

const PASSENGER_ID = "650f9c1e2f9c4b0012345678";

const mockRideData = {
  passengerId: PASSENGER_ID,
  from: { address: "100 Main St", lat: 9.03, lng: 38.74 },
  to: { address: "200 Market St", lat: 9.04, lng: 38.75 },
  distanceKm: 5.2,
  fare: 50
};

async function testSocket() {
  const socket = io("http://localhost:5000", {
    auth: { token: "mock-jwt-token" },
    transports: ["websocket"], // force websocket, avoid polling issues
  });

  socket.on("connect", () => {
    console.log("✅ Connected to server:", socket.id);

    socket.emit("joinRoom", { userId: PASSENGER_ID });

    console.log("🚖 Sending ride request...");
    socket.emit("ride:request", mockRideData);
  });

  socket.on("ride:new", (ride) => console.log("🚖 New ride received:", ride));
  socket.on("ride:accepted", (ride) => console.log("✅ Ride accepted:", ride));
  socket.on("ride:started", (ride) => console.log("🏁 Ride started:", ride));
  socket.on("ride:completed", (ride) => console.log("🎉 Ride completed:", ride));
  socket.on("wallet:update", (data) => console.log("💰 Wallet updated:", data));
  socket.on("disconnect", () => console.log("🔴 Disconnected from server"));
  socket.on("connect_error", (err) => console.log("❌ Socket error:", err.message));
}

testSocket();
