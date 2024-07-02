import roomService from "./services/room.service";

module.exports.loop = function () {
  roomService.routines();
};
