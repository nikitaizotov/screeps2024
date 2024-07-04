import { RoomService } from "./services/room.service";
// const profiler = require("screeps-profiler");

// profiler.enable();
const roomService = new RoomService();
module.exports.loop = function () {
  // profiler.wrap(function () {
  roomService.cacheRoutines();
  roomService.creepRoutines();
  roomService.structureRoutines();
  // });
};
