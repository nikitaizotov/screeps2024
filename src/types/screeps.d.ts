declare namespace NodeJS {
  interface Global {
    log: any;
  }
}

interface CreepMemory {
  path?: PathStep[];
  targetId?: Id<Source | Structure | ConstructionSite> | null;
  building?: boolean;
  targetPos?: RoomPosition;
  lastPos?: { x: number; y: number; energy: number };
  idleTicks?: number;
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
  targetSource?: Id<StructureContainer> | null;
  targetSourceId?: Id<Source>;
  harvestingFromContainer?: boolean;
  working?: boolean;
  targetRoom?: string;
  exit?: RoomPosition;
  job?: scoutJobs;
}

interface Memory {
  uuid: number;
  log: any;
  structureCache: { [roomName: string]: StructureCache };
  cachedPaths: CachedPath[];
  exitZones: { [roomName: string]: ExitZone[] };
  roomTerrain: { [roomName: string]: number[][] };
  connectedPoints: { [key: string]: string[] };
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
