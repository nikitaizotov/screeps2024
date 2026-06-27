"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkService = void 0;
const cache_service_1 = require("./cache.service");
class LinkService {
    constructor() {
        this.cacheService = new cache_service_1.CacheService();
    }
    isLinksAvailable(room) {
        if (room.controller && room.controller.level >= 5) {
            const links = room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType === STRUCTURE_LINK,
            });
            const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => site.structureType === STRUCTURE_LINK,
            });
            const maxLinks = CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level];
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
    }
    isStoragesLinked(room) {
        const storages = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
        });
        if (storages.length === 0) {
            return false;
        }
        const terrain = room.getTerrain();
        const offsets = [
            { x: -1, y: -1 },
            { x: 0, y: -1 },
            { x: 1, y: -1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: -1, y: 1 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        ];
        for (const storage of storages) {
            const storagePos = storage.pos;
            for (const offset of offsets) {
                const x = storagePos.x + offset.x;
                const y = storagePos.y + offset.y;
                // Ensure the position is within room boundaries and not a wall.
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    const structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                    const hasLink = structuresAtPos.some((structure) => structure.structureType === STRUCTURE_LINK);
                    if (hasLink) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    findBestLinkPosition(room, sourcePos) {
        const areaAroundStorage = room.lookForAtArea(LOOK_STRUCTURES, sourcePos.y - 2, sourcePos.x - 2, sourcePos.y + 2, sourcePos.x + 2, true);
        const linksInArea = areaAroundStorage.filter((spot) => spot.structure.structureType === STRUCTURE_LINK);
        if (linksInArea.length) {
            return null;
        }
        const terrain = room.getTerrain();
        const offsets = [
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
        let bestPosition = null;
        let maxFreeSpaces = -1;
        for (let offset of offsets) {
            const x = sourcePos.x + offset.x;
            const y = sourcePos.y + offset.y;
            // Ensure the position is within room boundaries and not a wall.
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                // Ensure there is no container at the position
                const structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                const hasContainer = structuresAtPos.some((structure) => structure.structureType === STRUCTURE_CONTAINER);
                if (!hasContainer) {
                    const area = room.lookForAtArea(LOOK_TERRAIN, y - 1, x - 1, y + 1, x + 1, true);
                    const freeSpaces = area.filter((spot) => spot.terrain !== "wall").length;
                    // Check if this position has more free spaces than the current best.
                    if (freeSpaces > maxFreeSpaces) {
                        bestPosition = new RoomPosition(x, y, room.name);
                        maxFreeSpaces = freeSpaces;
                    }
                }
            }
        }
        return bestPosition;
    }
    findLinkPosition(room, storagePos) {
        const areaAroundStorage = room.lookForAtArea(LOOK_STRUCTURES, storagePos.y - 2, storagePos.x - 2, storagePos.y + 2, storagePos.x + 2, true);
        const linksInArea = areaAroundStorage.filter((spot) => spot.structure.structureType === STRUCTURE_LINK);
        if (linksInArea.length) {
            return null;
        }
        const terrain = room.getTerrain();
        const offsets = [
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
        let bestPosition = null;
        let maxFreeSpaces = -1;
        for (const offset of offsets) {
            const x = storagePos.x + offset.x;
            const y = storagePos.y + offset.y;
            // Ensure the position is within room boundaries and is not a wall.
            const terrainType = terrain.get(x, y);
            if (terrainType !== TERRAIN_MASK_WALL) {
                // Ensure there are no structures or construction sites at the position
                const structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                const constructionSitesAtPos = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                if (structuresAtPos.length === 0 &&
                    constructionSitesAtPos.length === 0) {
                    const area = room.lookForAtArea(LOOK_TERRAIN, y - 1, x - 1, y + 1, x + 1, true);
                    const freeSpaces = area.filter((spot) => spot.terrain !== "wall" &&
                        (spot.terrain === "plain" ||
                            spot.terrain === "swamp" ||
                            spot.terrain === "road")).length;
                    // Check if this position has more free spaces than the current best.
                    if (freeSpaces > maxFreeSpaces) {
                        bestPosition = new RoomPosition(x, y, room.name);
                        maxFreeSpaces = freeSpaces;
                    }
                }
            }
        }
        return bestPosition;
    }
    buildLinks(room) {
        const storages = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
        });
        if (storages.length === 0) {
            return;
        }
        // Link storage.
        if (!this.isStoragesLinked(room)) {
            for (let storage of storages) {
                const bestPosition = this.findLinkPosition(room, storage.pos);
                if (bestPosition) {
                    // room.createFlag(bestPosition, `Storage-${storage.id}`, COLOR_YELLOW);
                    room.createConstructionSite(bestPosition.x, bestPosition.y, STRUCTURE_LINK);
                }
            }
        }
        // Link sources.
        const sources = this.cacheService.findSources(room);
        for (let source of sources) {
            const bestSourcePosition = this.findBestLinkPosition(room, source.pos);
            if (bestSourcePosition) {
                room.createConstructionSite(bestSourcePosition.x, bestSourcePosition.y, STRUCTURE_LINK);
                // room.createFlag(
                //   bestSourcePosition,
                //   `SourceFlag-${source.id}`,
                //   COLOR_YELLOW
                // );
            }
        }
        // Link terminals.
        const terminals = this.cacheService.findTerminals(room);
        console.log("terminals", terminals);
        for (let terminal of terminals) {
            const bestLinkPos = this.findLinkPosition(room, terminal.pos);
            if (bestLinkPos) {
                room.createConstructionSite(bestLinkPos.x, bestLinkPos.y, STRUCTURE_LINK);
            }
        }
    }
    cacheLinks(room) {
        if (!Memory.roomData.links) {
            Memory.roomData.links = {};
        }
        if (!Memory.roomData.links[room.name]) {
            Memory.roomData.links[room.name] = {};
        }
        const links = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_LINK,
        });
        for (let link of links) {
            if (!Memory.roomData.links[room.name][link.id]) {
                Memory.roomData.links[room.name][link.id] = {
                    storageLink: this.isLinkNearStorage(room, link.pos),
                };
            }
        }
    }
    isLinkNearStorage(room, pos) {
        console.log("isLinkNearStorage");
        const terrain = room.getTerrain();
        const offsets = [
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
        for (const offset of offsets) {
            const x = pos.x + offset.x;
            const y = pos.y + offset.y;
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                const structuresAtPos = room.lookForAt(LOOK_STRUCTURES, x, y);
                const hasStorage = structuresAtPos.some((structure) => structure.structureType === STRUCTURE_STORAGE);
                if (hasStorage) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.LinkService = LinkService;
exports.default = LinkService;
