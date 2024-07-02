"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var room_service_1 = __importDefault(require("./room.service"));
module.exports.loop = function () {
    room_service_1.default.routines();
};
