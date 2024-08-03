declare namespace NodeJS {
  interface Global {
    log: any;
  }
}

interface CreepMemory {
  path?: PathStep[];
  targetId?: Id<
    Source | Structure | ConstructionSite | ResourceConstant
  > | null;
  building?: boolean;
  targetPos?: RoomPosition | null;
  lastPos?: { x: number; y: number; energy: number };
  idleTicks: number;
  pathColor?: string;
  role?: string;
  spawnRoom?: string;
  transferring?: boolean;
  initialized?: boolean;
  buildingSpawn?: boolean;
  nextRooms?: string[];
  repairing?: boolean;
  upgrading?: boolean;
  targetContainerId?: Id<StructureContainer> | null;
  targetStructureId?: Id;
  targetStorageId?: Id;
  targetSource?: Id<StructureContainer> | null;
  targetSourceId?: Id<Source>;
  focusOnLink?: boolean;
  harvestingFromContainer?: boolean;
  working?: boolean;
  targetRoom?: string;
  exit?: RoomPosition;
  job?: scoutJobs;
  task?: WorkerTask;
  pathName: string;
  // For workers.
  prevRoom?: string;
  roomChangedTicksAgo?: number;
  // Used by scouts.
  route?:
    | Array<{
        exit: ExitConstant;
        room: string;
      }>
    | ERR_NO_PATH;
}

interface RoomData {
  sourcePositions: { [roomName: string]: number };
  exits?: {
    [roomName: string]: {
      [FIND_EXIT_TOP]: PathStep[];
      [FIND_EXIT_RIGHT]: PathStep[];
      [FIND_EXIT_BOTTOM]: PathStep[];
      [FIND_EXIT_LEFT]: PathStep[];
    };
  };
  links: {
    [roomName: string]: {
      [linkId: string]: {
        storageLink: boolean;
      };
    };
  };
  fixingWallsRampartsEnabled: {
    [roomName: string]: boolean;
  };
  junk?: any;
}

interface CachedCreepPath {
  lastAccessed: number;
  path: PathStep[];
  usedTimes: number;
}

interface Memory {
  uuid: number;
  log: any;
  structureCache: { [roomName: string]: StructureCache };
  cachedPaths: CachedPath[];
  exitZones: { [roomName: string]: ExitZone[] };
  roomTerrain: { [roomName: string]: number[][] };
  connectedPoints: { [key: string]: string[] };
  currentRoomIndex: number;
  currentOperationIndex: number;
  buildOrderPosition: { [roomName: string]: number };
  cachedPaths: { [roomName: string]: number };
  roomData: RoomData;
  cacheCreepPaths: {
    [roomName: string]: {
      [key: string]: CachedCreepPath;
    };
  };
  creepRoomCache: {
    [roomName: string]: AnyStructure[];
  };
  profiler?: any;
  duration?: any;
  cache: {
    [cacheKey: string]: {
      [roomName: string]: Id<Structure>[] | Id;
    };
  };
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
