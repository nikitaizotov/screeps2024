"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const room_service_1 = require("./room.service");
const profiler = require("screeps-profiler");
// profiler.enable();
const roomService = new room_service_1.RoomService();
module.exports.loop = function () {
    profiler.wrap(function () {
        roomService.routines();
    });
};
