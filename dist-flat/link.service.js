"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LinkService = /** @class */ (function () {
    function LinkService() {
    }
    LinkService.prototype.isLinksAvailable = function (room) {
        if (room.controller && room.controller.level >= 5) {
            var links = room.find(FIND_STRUCTURES, {
                filter: function (structure) { return structure.structureType === STRUCTURE_LINK; },
            });
            var constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
                filter: function (site) { return site.structureType === STRUCTURE_LINK; },
            });
            var maxLinks = CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level];
            if (links.length + constructionSites.length < maxLinks) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    };
    LinkService.prototype.isStoragesLinked = function (room) {
        var storages = room.find(FIND_STRUCTURES, {
            filter: function (structure) { return structure.structureType === STRUCTURE_STORAGE; },
        });
        if (storages.length === 0) {
            return false;
        }
        var terrain = room.getTerrain();
        var offsets = [
            { x: -1, y: -1 },
            { x: 0, y: -1 },
            { x: 1, y: -1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: -1, y: 1 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        ];
        // Проверяем каждое хранилище
        for (var _i = 0, storages_1 = storages; _i < storages_1.length; _i++) {
            var storage = storages_1[_i];
            var storagePos = storage.pos;
            for (var _a = 0, offsets_1 = offsets; _a < offsets_1.length; _a++) {
                var offset = offsets_1[_a];
                var x = storagePos.x + offset.x;
                var y = storagePos.y + offset.y;
                // Ensure the position is within room boundaries and not a wall.
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    var structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                    var hasLink = structuresAtPos.some(function (structure) { return structure.structureType === STRUCTURE_LINK; });
                    if (hasLink) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    LinkService.prototype.findBestLinkPosition = function (room, sourcePos) {
        var terrain = room.getTerrain();
        var offsets = [
            { x: -2, y: -2 },
            { x: -1, y: -2 },
            { x: 0, y: -2 },
            { x: 1, y: -2 },
            { x: 2, y: -2 },
            { x: -2, y: -1 },
            { x: 2, y: -1 },
            { x: -2, y: 0 },
            { x: 2, y: 0 },
            { x: -2, y: 1 },
            { x: 2, y: 1 },
            { x: -2, y: 2 },
            { x: -1, y: 2 },
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ];
        var bestPosition = null;
        var maxFreeSpaces = -1;
        for (var _i = 0, offsets_2 = offsets; _i < offsets_2.length; _i++) {
            var offset = offsets_2[_i];
            var x = sourcePos.x + offset.x;
            var y = sourcePos.y + offset.y;
            // Ensure the position is within room boundaries and not a wall.
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                // Ensure there is no container at the position
                var structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                var hasContainer = structuresAtPos.some(function (structure) { return structure.structureType === STRUCTURE_CONTAINER; });
                if (!hasContainer) {
                    var area = room.lookForAtArea(LOOK_TERRAIN, y - 1, x - 1, y + 1, x + 1, true);
                    var freeSpaces = area.filter(function (spot) { return spot.terrain !== "wall"; }).length;
                    // Check if this position has more free spaces than the current best.
                    if (freeSpaces > maxFreeSpaces) {
                        bestPosition = new RoomPosition(x, y, room.name);
                        maxFreeSpaces = freeSpaces;
                    }
                }
            }
        }
        return bestPosition;
    };
    LinkService.prototype.findBestLinkPositionNearStorage = function (room, storagePos) {
        var terrain = room.getTerrain();
        var offsets = [
            { x: -2, y: -2 },
            { x: -1, y: -2 },
            { x: 0, y: -2 },
            { x: 1, y: -2 },
            { x: 2, y: -2 },
            { x: -2, y: -1 },
            { x: 2, y: -1 },
            { x: -2, y: 0 },
            { x: 2, y: 0 },
            { x: -2, y: 1 },
            { x: 2, y: 1 },
            { x: -2, y: 2 },
            { x: -1, y: 2 },
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ];
        var bestPosition = null;
        var maxFreeSpaces = -1;
        for (var _i = 0, offsets_3 = offsets; _i < offsets_3.length; _i++) {
            var offset = offsets_3[_i];
            var x = storagePos.x + offset.x;
            var y = storagePos.y + offset.y;
            // Ensure the position is within room boundaries and is not a wall.
            var terrainType = terrain.get(x, y);
            if (terrainType !== TERRAIN_MASK_WALL) {
                // Ensure there are no structures or construction sites at the position
                var structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                var constructionSitesAtPos = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                if (structuresAtPos.length === 0 &&
                    constructionSitesAtPos.length === 0) {
                    var area = room.lookForAtArea(LOOK_TERRAIN, y - 1, x - 1, y + 1, x + 1, true);
                    var freeSpaces = area.filter(function (spot) {
                        return spot.terrain !== "wall" &&
                            (spot.terrain === "plain" ||
                                spot.terrain === "swamp" ||
                                spot.terrain === "road");
                    }).length;
                    // Check if this position has more free spaces than the current best.
                    if (freeSpaces > maxFreeSpaces) {
                        bestPosition = new RoomPosition(x, y, room.name);
                        maxFreeSpaces = freeSpaces;
                    }
                }
            }
        }
        return bestPosition;
    };
    LinkService.prototype.buildLinks = function (room) {
        var storages = room.find(FIND_STRUCTURES, {
            filter: function (structure) { return structure.structureType === STRUCTURE_STORAGE; },
        });
        if (storages.length === 0) {
            return;
        }
        // Link storage.
        if (!this.isStoragesLinked(room)) {
            for (var _i = 0, storages_2 = storages; _i < storages_2.length; _i++) {
                var storage = storages_2[_i];
                var bestPosition = this.findBestLinkPositionNearStorage(room, storage.pos);
                if (bestPosition) {
                    // room.createFlag(bestPosition, `Storage-${storage.id}`, COLOR_YELLOW);
                    room.createConstructionSite(bestPosition.x, bestPosition.y, STRUCTURE_LINK);
                }
            }
        }
        // Link sources.
        var sources = room.find(FIND_SOURCES);
        for (var _a = 0, sources_1 = sources; _a < sources_1.length; _a++) {
            var source = sources_1[_a];
            var bestSourcePosition = this.findBestLinkPosition(room, source.pos);
            if (bestSourcePosition) {
                room.createConstructionSite(bestSourcePosition.x, bestSourcePosition.y, STRUCTURE_LINK);
                // room.createFlag(
                //   bestSourcePosition,
                //   `SourceFlag-${source.id}`,
                //   COLOR_YELLOW
                // );
            }
        }
    };
    return LinkService;
}());
exports.default = LinkService;
