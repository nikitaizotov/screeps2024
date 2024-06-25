import roomService from "./room.service";

module.exports.loop = function () {
  roomService.routines();
};
