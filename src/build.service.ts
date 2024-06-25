import containerService from "./conatiner.service";

interface CachedPath {
  x: number;
  y: number;
  roomName: string;
}

interface ExitZone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface StructureCache {
  spawns: StructureSpawn[];
  constructionSites: ConstructionSite[];
  existingStructures: AnyOwnedStructure[];
}

const buildService = {
  structureCache: {} as { [roomName: string]: StructureCache },
  cachedPaths: [] as CachedPath[],
  exitZones: [] as ExitZone[],
  roomTerrain: {},
  buildOrder: [
    STRUCTURE_EXTENSION,
    STRUCTURE_TOWER,
    STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL,
    STRUCTURE_LAB,
    STRUCTURE_OBSERVER,
    STRUCTURE_NUKER,
    STRUCTURE_POWER_SPAWN,
  ],
  firstStructurePos: null as RoomPosition | null,

  build(): void {
    try {
      if (!Memory.structureCache) {
        Memory.structureCache = {};
      }
      if (!Memory.cachedPaths) {
        Memory.cachedPaths = [];
      }
      if (!Memory.exitZones) {
        Memory.exitZones = {};
      }
      if (!Memory.roomTerrain) {
        Memory.roomTerrain = {};
      }

      // if (Game.time % 15000 === 0) {
      //   this.planRoads();
      // }

      // if (Game.time % 90 === 0) {
      //   this.processBuildOrder();
      // }

      // if (Game.time % 111 === 0) {
      //   this.connectFirstStructure();
      // }

      // if (Game.time % 222 === 0) {
      //   this.blockExits();
      // }

      const rooms = Game.rooms;
      for (let roomName in rooms) {
        const room = rooms[roomName];

        this.buildContainers(room);
      }
    } catch (error: any) {
      console.log(`Error in run: ${error.message}`);
    }
  },

  planRoads(): void {
    try {
      if (!Memory.cachedPaths) {
        Memory.cachedPaths = [];
      }
      if (!Memory.connectedPoints) {
        Memory.connectedPoints = {};
      }

      let rooms = Game.rooms;
      let allSpawns: RoomPosition[] = [];

      for (let roomName in rooms) {
        let room = rooms[roomName];
        if (room.controller && room.controller.my) {
          let spawns = room.find(FIND_MY_SPAWNS);
          for (let spawn of spawns) {
            allSpawns.push(spawn.pos);
          }
        }
      }

      const hashPos = (pos: RoomPosition): string =>
        `${pos.roomName}_${pos.x}_${pos.y}`;

      const addConnection = (pos1: RoomPosition, pos2: RoomPosition): void => {
        let key1 = hashPos(pos1);
        let key2 = hashPos(pos2);
        if (!Memory.connectedPoints[key1]) {
          Memory.connectedPoints[key1] = [];
        }
        Memory.connectedPoints[key1].push(key2);
      };

      const isConnected = (pos1: RoomPosition, pos2: RoomPosition): boolean => {
        let key1 = hashPos(pos1);
        let key2 = hashPos(pos2);
        return (
          Memory.connectedPoints[key1] &&
          Memory.connectedPoints[key1].includes(key2)
        );
      };

      const checkAndRepairRoad = (): void => {
        for (let posData of Memory.cachedPaths) {
          let pos = new RoomPosition(posData.x, posData.y, posData.roomName);
          let room = Game.rooms[pos.roomName];
          if (room && room.controller && room.controller.my) {
            let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
            let hasRoad = structures.some(
              (s) => s.structureType === STRUCTURE_ROAD
            );

            if (!hasRoad) {
              let constructionSites = room.lookForAt(
                LOOK_CONSTRUCTION_SITES,
                pos.x,
                pos.y
              );
              let hasConstructionSite = constructionSites.some(
                (s) => s.structureType === STRUCTURE_ROAD
              );

              if (!hasConstructionSite) {
                room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
              }
            }
          }
        }
      };

      const planRoadBetween = (
        pos1: RoomPosition,
        pos2: RoomPosition
      ): void => {
        if (isConnected(pos1, pos2)) return;

        let path = PathFinder.search(
          pos1,
          { pos: pos2, range: 1 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              let room = Game.rooms[roomName];
              if (!room || !room.controller || !room.controller.my) {
                return new PathFinder.CostMatrix();
              }

              let costs = new PathFinder.CostMatrix();

              room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType === STRUCTURE_ROAD) {
                  costs.set(struct.pos.x, struct.pos.y, 1);
                } else if (
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART &&
                  !(struct instanceof OwnedStructure && struct.my === false)
                ) {
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
                }
              });

              return costs;
            },
          }
        ).path;

        Memory.cachedPaths.push(
          ...path.map((pos) => ({ x: pos.x, y: pos.y, roomName: pos.roomName }))
        );

        for (let pos of path) {
          Game.rooms[pos.roomName].createConstructionSite(
            pos.x,
            pos.y,
            STRUCTURE_ROAD
          );
        }

        addConnection(pos1, pos2);
      };

      for (let roomName in rooms) {
        let room = rooms[roomName];
        if (room.controller && room.controller.my) {
          let keyPoints: RoomPosition[] = [];

          let spawns = room.find(FIND_MY_SPAWNS);
          for (let spawn of spawns) {
            keyPoints.push(spawn.pos);
          }

          let sources = room.find(FIND_SOURCES);
          for (let source of sources) {
            keyPoints.push(source.pos);
          }

          let controller = room.controller;
          if (controller) {
            keyPoints.push(controller.pos);
          }

          for (let i = 0; i < keyPoints.length; i++) {
            for (let j = i + 1; j < keyPoints.length; j++) {
              planRoadBetween(keyPoints[i], keyPoints[j]);
            }
          }
        }
      }

      for (let i = 0; i < allSpawns.length; i++) {
        for (let j = i + 1; j < allSpawns.length; j++) {
          if (allSpawns[i].roomName !== allSpawns[j].roomName) {
            planRoadBetween(allSpawns[i], allSpawns[j]);
          }
        }
      }

      checkAndRepairRoad();
    } catch (error: any) {
      console.log(`Error in planRoads: ${error.message}`);
    }
  },

  buildContainers(room: Room): void {
    containerService.buildContainers(room);
  },

  processBuildOrder(): void {
    try {
      const rooms = Game.rooms;
      for (let roomName in rooms) {
        const room = rooms[roomName];
        if (room.controller && room.controller.my) {
          if (!Memory.exitZones[room.name] || Game.time % 5000 === 0) {
            Memory.exitZones[room.name] = this.getExitZones(room);
          }
          this.exitZones = Memory.exitZones[room.name];

          if (!Memory.roomTerrain[room.name]) {
            Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
          }
          this.roomTerrain = Memory.roomTerrain[room.name];

          if (!Memory.structureCache[room.name] || Game.time % 100 === 0) {
            Memory.structureCache[room.name] = {
              spawns: room.find(FIND_MY_SPAWNS),
              constructionSites: room.find(FIND_CONSTRUCTION_SITES),
              existingStructures: room.find(FIND_MY_STRUCTURES),
            };
          }
          const { spawns, constructionSites, existingStructures } =
            Memory.structureCache[room.name];

          if (spawns.length === 0) {
            this.buildStructure(
              room,
              STRUCTURE_SPAWN,
              1,
              constructionSites,
              existingStructures
            );
          } else {
            for (let i = 0; i < this.buildOrder.length; i++) {
              const structureType = this.buildOrder[i];
              const availableCount = this.getAvailableStructureCount(
                room,
                structureType,
                existingStructures,
                constructionSites
              );

              if (availableCount > 0) {
                this.buildStructure(
                  room,
                  structureType,
                  1,
                  constructionSites,
                  existingStructures
                );
                break;
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in processBuildOrder: ${error.message}`);
    }
  },

  buildStructure(
    room: Room,
    type: BuildableStructureConstant,
    maxCount: number,
    constructionSites: ConstructionSite[],
    existingStructures: AnyOwnedStructure[]
  ): void {
    try {
      let structuresPlanned = 0;
      const roomCenter = new RoomPosition(25, 25, room.name);
      let exitZones = this.exitZones;
      let cachedPaths = Memory.cachedPaths;

      for (let radius = 1; structuresPlanned < maxCount; radius += 2) {
        for (let xOffset = -radius; xOffset <= radius; xOffset += 2) {
          for (let yOffset = -radius; yOffset <= radius; yOffset += 2) {
            let x = roomCenter.x + xOffset;
            let y = roomCenter.y + yOffset;

            if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
              continue;
            }

            if (
              this.isValidConstructionPosition(
                room,
                x,
                y,
                constructionSites,
                existingStructures
              )
            ) {
              if (room.createConstructionSite(x, y, type) === OK) {
                structuresPlanned++;
                if (!this.firstStructurePos) {
                  this.firstStructurePos = new RoomPosition(x, y, room.name);
                }
                if (structuresPlanned >= maxCount) {
                  return;
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in buildStructure: ${error.message}`);
    }
  },

  buildSpawn(room: Room): void {
    try {
      if (room.find(FIND_MY_SPAWNS).length === 0) {
        this.buildStructure(
          room,
          STRUCTURE_SPAWN,
          1,
          [],
          room.find(FIND_MY_STRUCTURES)
        );
      }
    } catch (error: any) {
      console.log(`Error in buildSpawn: ${error.message}`);
    }
  },

  connectFirstStructure(): void {
    try {
      let exitZones = this.exitZones;
      let cachedPaths = Memory.cachedPaths;

      for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
          const roomCenter = new RoomPosition(25, 25, room.name);
          let maxRadius = 25;

          try {
            for (let radius = 1; radius <= maxRadius; radius++) {
              let found = false;
              for (let xOffset = -radius; xOffset <= radius; xOffset++) {
                for (let yOffset = -radius; yOffset <= radius; yOffset++) {
                  if (
                    Math.abs(xOffset) !== radius &&
                    Math.abs(yOffset) !== radius
                  ) {
                    continue;
                  }

                  let x = roomCenter.x + xOffset;
                  let y = roomCenter.y + yOffset;

                  if (x < 0 || x > 49 || y < 0 || y > 49) {
                    continue;
                  }

                  if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
                    continue;
                  }

                  let constructionSites = room.lookForAt(
                    LOOK_CONSTRUCTION_SITES,
                    x,
                    y
                  );

                  let structures = room.lookForAt(LOOK_STRUCTURES, x, y);

                  let hasExtensionConstructionSite = constructionSites.some(
                    (site) => site.structureType === STRUCTURE_EXTENSION
                  );

                  let hasExtension = structures.some(
                    (structure) =>
                      structure.structureType === STRUCTURE_EXTENSION
                  );

                  if (hasExtensionConstructionSite || hasExtension) {
                    this.buildRoadsFromFirstStructure(
                      room,
                      new RoomPosition(x, y, roomName)
                    );
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            }
          } catch (error: any) {
            console.log(`Error connectFirstStructure in ${roomName}: ${error}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in connectFirstStructure: ${error.message}`);
    }
  },

  buildRoadsAroundStructures(): void {
    try {
      for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
          try {
            const structures = room.find(FIND_STRUCTURES, {
              filter: (structure) => {
                return (
                  structure.structureType !== STRUCTURE_ROAD &&
                  structure.structureType !== STRUCTURE_WALL &&
                  structure.structureType !== STRUCTURE_RAMPART
                );
              },
            });

            structures.forEach((structure) => {
              let x = structure.pos.x;
              let y = structure.pos.y;

              let positions = [
                [x - 1, y - 1],
                [x, y - 1],
                [x + 1, y - 1],
                [x - 1, y],
                [x + 1, y],
                [x - 1, y + 1],
                [x, y + 1],
                [x + 1, y + 1],
              ];

              positions.forEach((pos) => {
                let [x, y] = pos;
                if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                  let look = room.lookAt(x, y);
                  let isRoadPresent = look.some(
                    (lookObject) =>
                      lookObject.type === LOOK_STRUCTURES &&
                      lookObject.structure &&
                      lookObject.structure.structureType === STRUCTURE_ROAD
                  );
                  let isConstructionSitePresent = look.some(
                    (lookObject) =>
                      lookObject.type === LOOK_CONSTRUCTION_SITES &&
                      lookObject.constructionSite &&
                      lookObject.constructionSite.structureType ===
                        STRUCTURE_ROAD
                  );
                  let isObstacle = look.some(
                    (lookObject) =>
                      lookObject.type === LOOK_TERRAIN &&
                      lookObject.terrain === "wall"
                  );

                  if (
                    !isRoadPresent &&
                    !isConstructionSitePresent &&
                    !isObstacle
                  ) {
                    room.createConstructionSite(x, y, STRUCTURE_ROAD);
                  }
                }
              });
            });
          } catch (error: any) {
            console.log(
              `Error buildRoadsAroundStructures in ${roomName}: ${error.message}`
            );
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in buildRoadsAroundStructures: ${error.message}`);
    }
  },

  buildRoadsFromFirstStructure(room: Room, startPos: RoomPosition): void {
    try {
      console.log("buildRoadsFromFirstStructure");
      let sources = room.find(FIND_SOURCES);
      let controller = room.controller;

      let targets = sources.map((source) => source.pos);
      if (controller) {
        targets.push(controller.pos);
      }

      for (let target of targets) {
        let path = PathFinder.search(
          startPos,
          { pos: target, range: 1 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              let room = Game.rooms[roomName];
              if (!room || !room.controller || !room.controller.my)
                return new PathFinder.CostMatrix();

              let costs = new PathFinder.CostMatrix();

              room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType === STRUCTURE_ROAD) {
                  costs.set(struct.pos.x, struct.pos.y, 1);
                } else if (
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART &&
                  (struct as OwnedStructure).my !== false
                ) {
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
                }
              });

              return costs;
            },
          }
        ).path;

        for (let pos of path) {
          room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        }
      }
    } catch (error: any) {
      console.log(`Error in buildRoadsFromFirstStructure: ${error.message}`);
    }
  },

  isRestrictedZone(
    exitZones: ExitZone[],
    cachedPaths: CachedPath[],
    x: number,
    y: number
  ): boolean {
    try {
      for (let zone of exitZones) {
        if (
          x >= zone.xMin &&
          x <= zone.xMax &&
          y >= zone.yMin &&
          y <= zone.yMax
        ) {
          return true;
        }
      }

      for (let pos of cachedPaths) {
        if (Math.abs(pos.x - x) <= 1 && Math.abs(pos.y - y) <= 1) {
          return true;
        }
      }

      return false;
    } catch (error: any) {
      console.log(`Error in isRestrictedZone: ${error.message}`);
      return false;
    }
  },

  isValidConstructionPosition(
    room: Room,
    x: number,
    y: number,
    constructionSites: ConstructionSite[],
    existingStructures: AnyOwnedStructure[]
  ): boolean {
    try {
      if (x <= 2 || y <= 2 || x >= 47 || y >= 47) return false;
      if (Memory.roomTerrain[room.name][x][y] === TERRAIN_MASK_WALL)
        return false;
      if (existingStructures.some((s) => s.pos.x === x && s.pos.y === y))
        return false;
      if (constructionSites.some((s) => s.pos.x === x && s.pos.y === y))
        return false;

      return true;
    } catch (error: any) {
      console.log(`Error in isValidConstructionPosition: ${error.message}`);
      return false;
    }
  },

  cacheRoomTerrain(roomName: string): number[][] {
    try {
      const terrain = new Room.Terrain(roomName);
      let terrainData: number[][] = [];

      for (let x = 0; x < 50; x++) {
        terrainData[x] = [];
        for (let y = 0; y < 50; y++) {
          terrainData[x][y] = terrain.get(x, y);
        }
      }

      return terrainData;
    } catch (error: any) {
      console.log(`Error in cacheRoomTerrain: ${error.message}`);
      return [];
    }
  },

  getExitZones(room: Room): ExitZone[] {
    try {
      let exitZones: ExitZone[] = [];
      const exitTypes = [
        FIND_EXIT_TOP,
        FIND_EXIT_RIGHT,
        FIND_EXIT_BOTTOM,
        FIND_EXIT_LEFT,
      ];

      for (const exitType of exitTypes) {
        const exitPositions = room.find(exitType);
        for (const pos of exitPositions) {
          exitZones.push({
            xMin: Math.max(0, pos.x - 5),
            xMax: Math.min(49, pos.x + 5),
            yMin: Math.max(0, pos.y - 5),
            yMax: Math.min(49, pos.y + 5),
          });
        }
      }

      return exitZones;
    } catch (error: any) {
      console.log(`Error in getExitZones: ${error.message}`);
      return [];
    }
  },

  getAvailableStructureCount(
    room: Room,
    structureType: BuildableStructureConstant,
    existingStructures: AnyOwnedStructure[],
    constructionSites: ConstructionSite[]
  ): number {
    try {
      const controllerLevel = room.controller?.level ?? 0;
      const maxStructures =
        CONTROLLER_STRUCTURES[structureType][controllerLevel];
      const existingCount = existingStructures.filter(
        (s) => s.structureType === structureType
      ).length;
      const constructionCount = constructionSites.filter(
        (s) => s.structureType === structureType
      ).length;

      return maxStructures - existingCount - constructionCount;
    } catch (error: any) {
      console.log(`Error in getAvailableStructureCount: ${error.message}`);
      return 0;
    }
  },

  blockExits(): void {
    try {
      const exitTypes = [
        FIND_EXIT_TOP,
        FIND_EXIT_RIGHT,
        FIND_EXIT_BOTTOM,
        FIND_EXIT_LEFT,
      ];

      for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
          if (!Memory.exitZones[room.name] || Game.time % 5000 === 0) {
            Memory.exitZones[room.name] = this.getExitZones(room);
          }
          const exitZones = Memory.exitZones[room.name];

          for (const exitType of exitTypes) {
            const exitPositions = room.find(exitType);

            if (exitPositions.length > 0) {
              let clusters: RoomPosition[][] = [];
              let currentCluster: RoomPosition[] = [];

              for (let i = 0; i < exitPositions.length; i++) {
                const pos = exitPositions[i];
                if (
                  currentCluster.length === 0 ||
                  (Math.abs(
                    pos.x - currentCluster[currentCluster.length - 1].x
                  ) <= 1 &&
                    Math.abs(
                      pos.y - currentCluster[currentCluster.length - 1].y
                    ) <= 1)
                ) {
                  currentCluster.push(pos);
                } else {
                  clusters.push(currentCluster);
                  currentCluster = [pos];
                }
              }

              if (currentCluster.length > 0) {
                clusters.push(currentCluster);
              }

              for (let cluster of clusters) {
                const midIndex = Math.floor(cluster.length / 2);
                const midExit = cluster[midIndex];
                let midX = midExit.x;
                let midY = midExit.y;

                switch (exitType) {
                  case FIND_EXIT_TOP:
                    midY += 2;
                    break;
                  case FIND_EXIT_RIGHT:
                    midX -= 2;
                    break;
                  case FIND_EXIT_BOTTOM:
                    midY -= 2;
                    break;
                  case FIND_EXIT_LEFT:
                    midX += 2;
                    break;
                }

                if (
                  room.lookForAt(LOOK_STRUCTURES, midX, midY).length === 0 &&
                  room.lookForAt(LOOK_CONSTRUCTION_SITES, midX, midY).length ===
                    0
                ) {
                  room.createConstructionSite(midX, midY, STRUCTURE_RAMPART);
                }

                for (let exitPosition of cluster) {
                  const x = exitPosition.x;
                  const y = exitPosition.y;

                  const wallPositions: { x: number; y: number }[] = [];
                  switch (exitType) {
                    case FIND_EXIT_TOP:
                      wallPositions.push({ x: x - 2, y: y + 1 });
                      wallPositions.push({ x: x - 2, y: y + 2 });
                      wallPositions.push({ x: x - 1, y: y + 2 });
                      wallPositions.push({ x: x, y: y + 2 });
                      wallPositions.push({ x: x + 1, y: y + 2 });
                      wallPositions.push({ x: x + 2, y: y + 2 });
                      wallPositions.push({ x: x + 2, y: y + 1 });
                      break;
                    case FIND_EXIT_RIGHT:
                      wallPositions.push({ x: x - 1, y: y - 2 });
                      wallPositions.push({ x: x - 2, y: y - 2 });
                      wallPositions.push({ x: x - 2, y: y - 1 });
                      wallPositions.push({ x: x - 2, y: y });
                      wallPositions.push({ x: x - 2, y: y + 1 });
                      wallPositions.push({ x: x - 2, y: y + 2 });
                      wallPositions.push({ x: x - 1, y: y + 2 });
                      break;
                    case FIND_EXIT_BOTTOM:
                      wallPositions.push({ x: x - 2, y: y - 1 });
                      wallPositions.push({ x: x - 2, y: y - 2 });
                      wallPositions.push({ x: x - 1, y: y - 2 });
                      wallPositions.push({ x: x, y: y - 2 });
                      wallPositions.push({ x: x + 1, y: y - 2 });
                      wallPositions.push({ x: x + 2, y: y - 2 });
                      wallPositions.push({ x: x + 2, y: y - 1 });
                      break;
                    case FIND_EXIT_LEFT:
                      wallPositions.push({ x: x + 1, y: y - 2 });
                      wallPositions.push({ x: x + 2, y: y - 2 });
                      wallPositions.push({ x: x + 2, y: y - 1 });
                      wallPositions.push({ x: x + 2, y: y });
                      wallPositions.push({ x: x + 2, y: y + 1 });
                      wallPositions.push({ x: x + 2, y: y + 2 });
                      wallPositions.push({ x: x + 1, y: y + 2 });
                      break;
                  }

                  for (const pos of wallPositions) {
                    if (
                      room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).length ===
                        0 &&
                      room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                        .length === 0
                    ) {
                      room.createConstructionSite(pos.x, pos.y, STRUCTURE_WALL);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in blockExits: ${error.message}`);
    }
  },
};

export default buildService;