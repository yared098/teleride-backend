import Ride from "../models/ride.model.js";
import User from "../models/user.model.js";
import haversine from "haversine-distance"; // npm install haversine-distance
import jwt from "jsonwebtoken";

export default function rideSocket(io) {
  // io.of("/ride").use( async(socket, next) => {
  io.use(async (socket, next) => {
    try {
      // Expect token in handshake headers
      const token = socket.handshake.auth?.token || socket.handshake.headers["authorization"]?.split(" ")[1];
      if (!token) throw new Error("No token provided");

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");

      // Attach user to socket for later use
      socket.user = user;
      next();
    } catch (err) {
      console.error("❌ Socket auth error:", err.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // 🔹 Helper for error handling
    const sendError = (type, err) => {
      const msg = typeof err === "string" ? err : err.message || "Unknown error";
      console.error(`❌ [${type}] ${msg}`);
      socket.emit("error:ride", { type, message: msg });
    };

    // 🔹 Join user room
    socket.on("joinRoom", async ({ userId }) => {
      try {
        socket.join(userId);
        await User.findByIdAndUpdate(userId, { socketId: socket.id });
        console.log(`👤 User ${userId} joined their room`);
      } catch (err) {
        sendError("joinRoom", err);
      }
    });

    // 🔹 Passenger requests a ride
    socket.on("ride:request", async (data) => {
      try {
        const { passengerId, from, to, distanceKm, fare } = data;
        const ride = await Ride.create({
          passenger: passengerId,
          from,
          to,
          distanceKm,
          fare,
          status: "requested",
        });

        const populatedRide = await ride.populate("passenger");
        console.log("🚖 New ride requested:", ride._id);

        // 🔍 Find nearby drivers (within 5km)
        const drivers = await User.find({
          role: "driver",
          socketId: { $ne: null },
          location: { $exists: true },
        });

        let sentCount = 0;
        for (const driver of drivers) {
          if (driver.location?.lat && driver.location?.lng) {
            const distance = haversine(
              { lat: from.lat, lng: from.lng },
              { lat: driver.location.lat, lng: driver.location.lng }
            );
            if (distance <= 5000) {
              io.to(driver.socketId).emit("ride:new", populatedRide);
              sentCount++;
            }
          }
        }

        if (sentCount === 0) {
          sendError("ride:request", "No nearby drivers found.");
        }
      } catch (err) {
        sendError("ride:request", err);
      }
    });

    // 🔹 Driver requests nearby rides
    socket.on("driver:nearby", async ({ driverId, location }) => {
      try {
        if (location) await User.findByIdAndUpdate(driverId, { location });

        const rides = await Ride.find({ status: "requested" }).populate("passenger");
        const driver = await User.findById(driverId);
        if (!driver) throw new Error("Driver not found");

        const nearbyRides = rides.filter((ride) => {
          if (!driver?.location || !ride.from) return false;
          const distance = haversine(
            { lat: ride.from.lat, lng: ride.from.lng },
            { lat: driver.location.lat, lng: driver.location.lng }
          );
          return distance <= 5000;
        });

        socket.emit("ride:list", nearbyRides);
      } catch (err) {
        sendError("driver:nearby", err);
      }
    });

    // 🔹 Driver accepts a ride
    socket.on("ride:accept", async ({ rideId, driverId }) => {
      try {
        const ride = await updateRideStatus(rideId, "accepted", {
          driver: driverId,
          startedAt: new Date(),
        });

        console.log(`✅ Ride accepted: ${rideId} by driver ${driverId}`);

        io.to(ride.passenger._id.toString()).emit("ride:accepted", ride);

        // Remove ride from other drivers
        const otherDrivers = await User.find({
          role: "driver",
          _id: { $ne: driverId },
          socketId: { $ne: null },
        });
        for (const driver of otherDrivers) {
          io.to(driver.socketId).emit("ride:remove", rideId);
        }
      } catch (err) {
        sendError("ride:accept", err);
      }
    });

    // 🔹 Driver rejects a ride
    socket.on("ride:reject", async ({ rideId }) => {
      try {
        await updateRideStatus(rideId, "requested", { driver: null });
      } catch (err) {
        sendError("ride:reject", err);
      }
    });

    // 🔹 Start ride
    socket.on("ride:start", async ({ rideId }) => {
      try {
        await updateRideStatus(rideId, "in_progress", { startedAt: new Date() });
      } catch (err) {
        sendError("ride:start", err);
      }
    });

    // 🔹 Driver live location updates every 2 seconds
    socket.on("driver:location", async ({ driverId, lat, lng }) => {
      try {
        const driver = await User.findByIdAndUpdate(
          driverId,
          { location: { lat, lng }, lastUpdated: new Date() },
          { new: true }
        );

        io.emit("driver:location:update", { driverId, lat, lng });

        // Check if the driver has an active ride
        const activeRide = await Ride.findOne({
          driver: driverId,
          status: { $in: ["accepted", "in_progress"] },
        }).populate("passenger");

        if (activeRide) {
          // Determine which ETA to calculate
          let target = null;
          let type = "";

          if (activeRide.status === "accepted") {
            // Before pickup — ETA to passenger
            target = activeRide.from;
            type = "to_pickup";
          } else if (activeRide.status === "in_progress") {
            // After pickup — ETA to drop-off
            target = activeRide.to;
            type = "to_dropoff";
          }

          if (target) {
            const distanceMeters = haversine(
              { lat, lng },
              { lat: target.lat, lng: target.lng }
            );
            const speedMps = 10; // Assume ~36 km/h average speed
            const etaSeconds = Math.round(distanceMeters / speedMps);

            // Emit ETA to passenger + driver
            io.to(driverId.toString()).emit("driver:eta:update", {
              rideId: activeRide._id,
              type,
              etaSeconds,
              distanceMeters,
            });

            io.to(activeRide.passenger._id.toString()).emit("driver:eta:update", {
              rideId: activeRide._id,
              type,
              etaSeconds,
              distanceMeters,
            });
          }
        }
      } catch (err) {
        sendError("driver:location", err);
      }
    });

    // 🔹 Complete ride
    socket.on("ride:complete", async ({ rideId, fare }) => {
      try {
        const ride = await updateRideStatus(rideId, "completed", {
          completedAt: new Date(),
          fare,
        });

        try {
          await payForRide(ride.passenger._id, ride._id, ride.fare);
        } catch (err) {
          sendError("ride:payment", err);
          io.to(ride.passenger._id.toString()).emit("payment:failed", { rideId });
        }
      } catch (err) {
        sendError("ride:complete", err);
      }
    });

    // 🔹 Tip driver
    socket.on("ride:tip", async ({ driverId, rideId, amount }) => {
      try {
        await tipDriver(driverId, rideId, amount);
        io.to(driverId.toString()).emit("wallet:update");
      } catch (err) {
        sendError("ride:tip", err);
      }
    });

    // 🔹 Cancel ride
    socket.on("ride:cancel", async ({ rideId }) => {
      try {
        await updateRideStatus(rideId, "cancelled");
      } catch (err) {
        sendError("ride:cancel", err);
      }
    });

    // 🔹 Passenger creates ride-sharing room
    socket.on("rideshare:create", async ({ passengerId, from, to, fare, maxPassengers = 3 }) => {
      try {
        const ride = await Ride.create({
          passenger: passengerId,
          from,
          to,
          fare,
          status: "rideshare_waiting",
          passengers: [passengerId],
          maxPassengers,
          shared: true,
        });

        const populatedRide = await ride.populate("passenger");
        socket.join(`rideshare_${ride._id}`);

        console.log(`🚘 Ride share created: ${ride._id} by ${passengerId}`);

        io.emit("rideshare:new", populatedRide);
      } catch (err) {
        sendError("rideshare:create", err);
      }
    });

    // 🔹 Passenger joins an existing rideshare
    socket.on("rideshare:join", async ({ rideId, passengerId }) => {
      try {
        const ride = await Ride.findById(rideId).populate("passenger passengers");

        if (!ride || !ride.shared) throw new Error("Ride share not found");
        if (ride.passengers.includes(passengerId)) throw new Error("Already joined");
        if (ride.passengers.length >= ride.maxPassengers) throw new Error("Ride share full");

        // Add passenger
        ride.passengers.push(passengerId);

        // Divide fare equally
        const sharedFare = ride.fare / ride.passengers.length;
        ride.sharedFare = sharedFare;

        await ride.save();

        socket.join(`rideshare_${ride._id}`);

        console.log(`👥 Passenger ${passengerId} joined ride share ${ride._id}`);

        const updatedRide = await ride.populate("passengers");

        io.to(`rideshare_${ride._id}`).emit("rideshare:update", updatedRide);

        // If room full → mark ready for driver pickup
        if (ride.passengers.length === ride.maxPassengers) {
          ride.status = "requested";
          await ride.save();
          io.emit("ride:share:ready", updatedRide);
          console.log(`🚀 Rideshare room ${ride._id} ready for driver pickup`);
        }
      } catch (err) {
        sendError("rideshare:join", err);
      }
    });

    // 🔹 Disconnect
    socket.on("disconnect", async () => {
      try {
        console.log("🔴 User disconnected:", socket.id);
        await User.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
      } catch (err) {
        sendError("disconnect", err);
      }
    });

    // ✅ Shared updater for ride status changes
    const updateRideStatus = async (rideId, status, extra = {}) => {
      const ride = await Ride.findByIdAndUpdate(
        rideId,
        { status, ...extra },
        { new: true }
      ).populate("passenger driver");

      if (!ride) throw new Error("Ride not found");

      io.to(ride.passenger._id.toString()).emit("ride:status", ride);
      io.to(ride.driver?._id?.toString()).emit("ride:status", ride);
      io.emit("ride:update", ride);
      return ride;
    };
  });
}
