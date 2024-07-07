export enum scoutJobs {
  MOVING_TO_NEXT_ROOM,
  CLAIMING,
  BUILDING,
}

export const scoutJobList = {
  [scoutJobs.MOVING_TO_NEXT_ROOM]: scoutJobs.MOVING_TO_NEXT_ROOM,
  [scoutJobs.CLAIMING]: scoutJobs.CLAIMING,
  [scoutJobs.BUILDING]: scoutJobs.BUILDING,
};
