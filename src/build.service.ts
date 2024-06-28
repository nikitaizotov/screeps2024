import { reverse } from "lodash";
import containerService from "./container.service";

interface PositionSegment {
  x: number;
  y: number;
}

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
      // Инициализация Memory, если не инициализировано
      if (!Memory.structureCache) Memory.structureCache = {};
      if (!Memory.cachedPaths) Memory.cachedPaths = [];
      if (!Memory.exitZones) Memory.exitZones = [] as any;
      if (!Memory.roomTerrain) Memory.roomTerrain = {};

      const rooms = Game.rooms;
      for (let roomName in rooms) {
        const room = rooms[roomName];

        if (
          room.controller &&
          room.controller.my &&
          !this.checkConstructionSites(room)
        ) {
          // Проверка и инициализация кэша для комнаты
          if (!Memory.structureCache[room.name]) {
            Memory.structureCache[room.name] = {
              spawns: room.find(FIND_MY_SPAWNS),
              constructionSites: room.find(FIND_CONSTRUCTION_SITES),
              existingStructures: room.find(FIND_MY_STRUCTURES),
            };
          }
          if (!Memory.exitZones[room.name]) {
            Memory.exitZones[room.name] = this.getExitZones(room);
          }
          if (!Memory.roomTerrain[room.name]) {
            Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
          }

          // Plan roads every 15000 ticks.
          if (Game.time % 15000 === 0) this.planRoads(room);

          // Process build queue every 90 ticks.
          if (Game.time % 90 === 0) this.processBuildOrder(room);

          // Connect the first structure every 111 ticks.
          if (Game.time % 111 === 0) this.connectFirstStructure(room);

          // Block exits every 222 ticks.
          if (Game.time % 222 === 0) this.blockExits(room);

          // Build roads around structures every 244 ticks.
          if (Game.time % 244 === 0) this.buildRoadsAroundStructures(room);

          // Build containers every 233 ticks.
          if (Game.time % 233 === 0) this.buildContainers(room);
        }
      }
    } catch (error: any) {
      console.log(`Error in buildService run: ${error.message}`);
    }
  },

  planRoads(room: Room): void {
    try {
      if (!Memory.cachedPaths) Memory.cachedPaths = [];
      if (!Memory.connectedPoints) Memory.connectedPoints = {};

      let allSpawns: RoomPosition[] = [];

      if (room.controller && room.controller.my) {
        let spawns = room.find(FIND_MY_SPAWNS);
        for (let spawn of spawns) allSpawns.push(spawn.pos);

        const hashPos = (pos: RoomPosition): string =>
          `${pos.roomName}_${pos.x}_${pos.y}`;

        const addConnection = (
          pos1: RoomPosition,
          pos2: RoomPosition
        ): void => {
          let key1 = hashPos(pos1);
          let key2 = hashPos(pos2);
          if (!Memory.connectedPoints[key1]) Memory.connectedPoints[key1] = [];
          Memory.connectedPoints[key1].push(key2);
        };

        const isConnected = (
          pos1: RoomPosition,
          pos2: RoomPosition
        ): boolean => {
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

                if (!hasConstructionSite)
                  room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
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
                if (!room || !room.controller || !room.controller.my)
                  return new PathFinder.CostMatrix();

                let costs = new PathFinder.CostMatrix();

                room.find(FIND_STRUCTURES).forEach(function (struct) {
                  if (struct.structureType === STRUCTURE_ROAD)
                    costs.set(struct.pos.x, struct.pos.y, 1);
                  else if (
                    struct.structureType !== STRUCTURE_CONTAINER &&
                    struct.structureType !== STRUCTURE_RAMPART &&
                    !(struct instanceof OwnedStructure && struct.my === false)
                  )
                    costs.set(struct.pos.x, struct.pos.y, 0xff);
                });

                return costs;
              },
            }
          ).path;

          Memory.cachedPaths.push(
            ...path.map((pos) => ({
              x: pos.x,
              y: pos.y,
              roomName: pos.roomName,
            }))
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

        let keyPoints: RoomPosition[] = [];

        for (let spawn of spawns) keyPoints.push(spawn.pos);

        let sources = room.find(FIND_SOURCES);
        for (let source of sources) keyPoints.push(source.pos);

        let controller = room.controller;
        if (controller) keyPoints.push(controller.pos);

        for (let i = 0; i < keyPoints.length; i++) {
          for (let j = i + 1; j < keyPoints.length; j++) {
            planRoadBetween(keyPoints[i], keyPoints[j]);
          }
        }

        checkAndRepairRoad();
      }
    } catch (error: any) {
      console.log(`Error in planRoads: ${error.message}`);
    }
  },

  buildContainers(room: Room): void {
    containerService.buildContainers(room);
  },

  processBuildOrder(room: Room): void {
    try {
      if (room.controller && room.controller.my) {
        if (!Memory.exitZones[room.name] || Game.time % 5000 === 0)
          Memory.exitZones[room.name] = this.getExitZones(room);
        this.exitZones = Memory.exitZones[room.name];

        if (!Memory.roomTerrain[room.name])
          Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
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

            if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) continue;

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
                if (!this.firstStructurePos)
                  this.firstStructurePos = new RoomPosition(x, y, room.name);
                if (structuresPlanned >= maxCount) return;
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

  connectFirstStructure(room: Room): void {
    try {
      let exitZones = this.exitZones;
      let cachedPaths = Memory.cachedPaths;

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
                )
                  continue;

                let x = roomCenter.x + xOffset;
                let y = roomCenter.y + yOffset;

                if (x < 0 || x > 49 || y < 0 || y > 49) continue;

                if (this.isRestrictedZone(exitZones, cachedPaths, x, y))
                  continue;

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
                  (structure) => structure.structureType === STRUCTURE_EXTENSION
                );

                if (hasExtensionConstructionSite || hasExtension) {
                  this.buildRoadsFromFirstStructure(
                    room,
                    new RoomPosition(x, y, room.name)
                  );
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
        } catch (error: any) {
          console.log(`Error connectFirstStructure in ${room.name}: ${error}`);
        }
      }
    } catch (error: any) {
      console.log(`Error in connectFirstStructure: ${error.message}`);
    }
  },

  buildRoadsAroundStructures(room: Room): void {
    try {
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
                    lookObject.constructionSite.structureType === STRUCTURE_ROAD
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
            `Error buildRoadsAroundStructures in ${room.name}: ${error.message}`
          );
        }
      }
    } catch (error: any) {
      console.log(`Error in buildRoadsAroundStructures: ${error.message}`);
    }
  },

  buildRoadsFromFirstStructure(room: Room, startPos: RoomPosition): void {
    try {
      let sources = room.find(FIND_SOURCES);
      let controller = room.controller;

      let targets = sources.map((source) => source.pos);
      if (controller) targets.push(controller.pos);

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
                if (struct.structureType === STRUCTURE_ROAD)
                  costs.set(struct.pos.x, struct.pos.y, 1);
                else if (
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART &&
                  (struct as OwnedStructure).my !== false
                )
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
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

  checkConstructionSites(room: Room): boolean {
    try {
      const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
      return constructionSites.length > 50;
    } catch (error: any) {
      console.log(`Error in checkConstructionSites: ${error.message}`);
      return false;
    }
  },
  blockExits(room: Room): void {
    try {
      const spawns = room.find(FIND_MY_SPAWNS);

      if (!spawns) {
        return;
      }

      const spawn: StructureSpawn = spawns[0];

      const exitTypes = [
        FIND_EXIT_TOP,
        FIND_EXIT_RIGHT,
        FIND_EXIT_BOTTOM,
        FIND_EXIT_LEFT,
      ];

      if (!Memory.roomData.exits) {
        Memory.roomData.exits = {};
      }

      if (!Memory.roomData.exits[room.name]) {
        Memory.roomData.exits[room.name] = {
          [FIND_EXIT_TOP]: this.getExitRampPoint(room, FIND_EXIT_TOP, spawn),
          [FIND_EXIT_RIGHT]: this.getExitRampPoint(
            room,
            FIND_EXIT_RIGHT,
            spawn
          ),
          [FIND_EXIT_BOTTOM]: this.getExitRampPoint(
            room,
            FIND_EXIT_BOTTOM,
            spawn
          ),
          [FIND_EXIT_LEFT]: this.getExitRampPoint(room, FIND_EXIT_LEFT, spawn),
        };
      }

      // for (let roomName in Game.rooms) {
      //   const room = Game.rooms[roomName];
      // if (room.controller && room.controller.my) {
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
              (Math.abs(pos.x - currentCluster[currentCluster.length - 1].x) <=
                1 &&
                Math.abs(pos.y - currentCluster[currentCluster.length - 1].y) <=
                  1)
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
                const rampartPositions =
                  Memory.roomData.exits[room.name][exitType];

                const structuresAtPos =
                  room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).length === 0;
                const constructionSitesAtPos =
                  room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                    .length === 0;

                if (structuresAtPos && constructionSitesAtPos) {
                  const isRampartPosition = rampartPositions.some(
                    (p) => p.x === pos.x && p.y === pos.y
                  );

                  const structureType = isRampartPosition
                    ? STRUCTURE_RAMPART
                    : STRUCTURE_WALL;
                  room.createConstructionSite(pos.x, pos.y, structureType);
                }
              }
            }
          }
        }
      }
      // }
      //}
    } catch (error: any) {
      console.log(`Error in blockExits: ${error.message}`);
    }
  },

  getExitRampPoint(
    room: Room,
    exitType:
      | FIND_EXIT_TOP
      | FIND_EXIT_RIGHT
      | FIND_EXIT_BOTTOM
      | FIND_EXIT_LEFT,
    spawn: StructureSpawn
  ): PathStep[] {
    const returnData: PathStep[] = [];
    const exitPositions = room.find(exitType);
    // Array to store segments of exit positions.
    const segments: PositionSegment[][] = [];
    // Array to store the current segment.
    let currentSegment: PositionSegment[] = [];

    // Sort exit positions to simplify processing. Sort based on exit type.
    exitPositions.sort((a, b) =>
      exitType === FIND_EXIT_TOP || exitType === FIND_EXIT_BOTTOM
        ? a.x - b.x
        : a.y - b.y
    );

    exitPositions.forEach((pos) => {
      if (
        currentSegment.length === 0 ||
        this.areAdjacent(currentSegment[currentSegment.length - 1], pos)
      ) {
        // Check if the current position is adjacent to the last position in the segment.
        // Add position to the current segment.
        currentSegment.push({ x: pos.x, y: pos.y });
      } else {
        // Add the current segment to segments array.
        segments.push(currentSegment);
        // Start a new segment.
        currentSegment = [{ x: pos.x, y: pos.y }];
      }
    });

    if (currentSegment.length > 0) {
      // Add the last segment if it exists.
      segments.push(currentSegment);
    }

    // Find the central points for each segment.
    const centralPoints = segments.map((segment) => {
      // Calculate the middle index.
      const midIndex = Math.floor(segment.length / 2);
      // Return the central point of the segment.
      return segment[midIndex];
    });

    for (let centralPoint of centralPoints) {
      const position = new RoomPosition(
        centralPoint.x,
        centralPoint.y,
        room.name
      );
      const path = spawn.pos.findPathTo(position);
      path.reverse();

      const MIN = 2;
      const MAX = 47;

      switch (exitType) {
        case FIND_EXIT_TOP:
          this.addRampartPosition(
            [null, MIN],
            [null, MIN - 1],
            returnData,
            path
          );
          break;
        case FIND_EXIT_RIGHT:
          this.addRampartPosition(
            [MAX, null],
            [MAX + 1, null],
            returnData,
            path
          );
          break;
        case FIND_EXIT_BOTTOM:
          this.addRampartPosition(
            [null, MAX],
            [null, MAX + 1],
            returnData,
            path
          );
          break;
        case FIND_EXIT_LEFT:
          this.addRampartPosition(
            [MIN, null],
            [MIN - 1, null],
            returnData,
            path
          );
          break;
      }
    }

    return returnData;
  },

  areAdjacent(pos1: PositionSegment, pos2: PositionSegment): boolean {
    const distance = Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    return distance === 1;
  },

  getPointOnPath(
    x: number | null,
    y: number | null,
    path: PathStep[]
  ): PathStep | null {
    for (let step of path) {
      if (x !== null && step.x === x) {
        return step;
      }

      if (y !== null && step.y === y) {
        return step;
      }
    }
    return null;
  },

  addRampartPosition(
    primaryPosition: any,
    secondaryPosition: any,
    returnData: PathStep[],
    path: PathStep[]
  ) {
    const primaryRampartPosition = this.getPointOnPath(
      primaryPosition[0],
      primaryPosition[1],
      path
    );
    if (primaryRampartPosition) {
      returnData.push(primaryRampartPosition);
    } else {
      const secondaryRampartPosition = this.getPointOnPath(
        secondaryPosition[0],
        secondaryPosition[1],
        path
      );
      if (secondaryRampartPosition) {
        returnData.push(secondaryRampartPosition);
      }
    }
  },
};

export default buildService;
