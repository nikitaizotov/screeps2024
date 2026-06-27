"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoutJobList = exports.scoutJobs = void 0;
var scoutJobs;
(function (scoutJobs) {
    scoutJobs[scoutJobs["MOVING_TO_NEXT_ROOM"] = 0] = "MOVING_TO_NEXT_ROOM";
    scoutJobs[scoutJobs["CLAIMING"] = 1] = "CLAIMING";
    scoutJobs[scoutJobs["BUILDING"] = 2] = "BUILDING";
})(scoutJobs || (exports.scoutJobs = scoutJobs = {}));
exports.scoutJobList = {
    [scoutJobs.MOVING_TO_NEXT_ROOM]: scoutJobs.MOVING_TO_NEXT_ROOM,
    [scoutJobs.CLAIMING]: scoutJobs.CLAIMING,
    [scoutJobs.BUILDING]: scoutJobs.BUILDING,
};
