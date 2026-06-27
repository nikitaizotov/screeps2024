"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const room_service_1 = require("./room.service");
// const profiler = require("screeps-profiler");
// profiler.enable();
const roomService = new room_service_1.RoomService();
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
            require("./kernel").runKernel();
        }
        catch (e) {
            console.log(`Kernel error: ${e.message}`);
        }
    }
};
