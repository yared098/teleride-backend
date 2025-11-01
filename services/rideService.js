import Ride from "../models/Ride.js";

let ioInstance = null; // store io reference for socket emits

// Function to inject socket.io instance when app starts
export const setSocketInstance = (io) => {
  ioInstance = io.of("/ride"); // using namespace
};

const rideService = {
  async createRide(riderId, pickupLocation, dropoffLocation) {
    const ride = await Ride.create({
      rider: riderId,
      pickupLocation,
      dropoffLocation,
      status: "requested",
    });

    // Notify all available drivers (for example, broadcast to all)
    if (ioInstance) {
      ioInstance.emit("newRideRequest", {
        rideId: ride._id,
        riderId,
        pickupLocation,
        dropoffLocation,
      });
    }

    return ride;
  },

  async assignDriver(rideId, driverId) {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error("Ride not found");
    if (ride.status !== "requested") throw new Error("Ride not available");

    ride.driver = driverId;
    ride.status = "accepted";
    await ride.save();

    // Notify the rider that driver accepted
    if (ioInstance) {
      ioInstance.to(rideId.toString()).emit("rideAccepted", {
        rideId,
        driverId,
        status: ride.status,
      });
    }

    return ride;
  },

  async startRide(rideId) {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error("Ride not found");

    ride.status = "started";
    ride.startTime = new Date();
    await ride.save();

    // Notify both parties
    if (ioInstance) {
      ioInstance.to(rideId.toString()).emit("rideStarted", {
        rideId,
        status: ride.status,
      });
    }

    return ride;
  },

  async completeRide(rideId, fare) {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error("Ride not found");

    ride.status = "completed";
    ride.endTime = new Date();
    ride.fare = fare || ride.fare;
    await ride.save();

    if (ioInstance) {
      ioInstance.to(rideId.toString()).emit("rideCompleted", {
        rideId,
        fare: ride.fare,
      });
    }

    return ride;
  },

  async cancelRide(rideId, cancelledBy = "system") {
    const ride = await Ride.findById(rideId);
    if (!ride) throw new Error("Ride not found");

    ride.status = "cancelled";
    await ride.save();

    if (ioInstance) {
      ioInstance.to(rideId.toString()).emit("rideCancelled", {
        rideId,
        cancelledBy,
      });
    }

    return ride;
  },

  async updateDriverLocation(rideId, location) {
    // broadcast driver location
    if (ioInstance) {
      ioInstance.to(rideId.toString()).emit("driverLocation", {
        rideId,
        location,
      });
    }
  },

  async getUserRides(userId) {
    return Ride.find({
      $or: [{ rider: userId }, { driver: userId }],
    }).sort({ createdAt: -1 });
  },

  async getActiveRides() {
    return Ride.find({ status: { $in: ["requested", "accepted", "started"] } })
      .populate("rider driver", "username firstName lastName");
  },
};

export default rideService;
