import { RoomService } from "./services/room.service";
// const profiler = require("screeps-profiler");

// profiler.enable();
const roomService = new RoomService();

// Init Memory.
if (!Memory.roomData) {
  Memory.roomData = {
    sourcePositions: {},
    exits: {},
    links: {},
    fixingWallsRampartsEnabled: {},
  };
}

module.exports.loop = function () {
  // profiler.wrap(function () {
  roomService.cacheRoutines();
  roomService.creepRoutines();
  roomService.structureRoutines();
  // });

  // Phase 0 kernel (dormant): loads and runs only when explicitly enabled via
  // Memory.kernel.enabled. Live behavior is unchanged until we turn it on.
  if (Memory.kernel && Memory.kernel.enabled) {
    try {
      require("./kernel/kernel").runKernel();
    } catch (e: any) {
      console.log(`Kernel error: ${e.message}`);
    }
  }
};
