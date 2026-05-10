export interface FullData {
  cars: CarData[];
  raceContext: RaceContext | null;
  lastUpdated: Date | null;
}

export interface CarData {
  carNumber: number;
  teamName: string | null;
  staticData: StaticData | null;
  dynamicsData: DynamicsData | null;
  enduranceData: EnduranceData | null;
}

export interface StaticData {
  carNumber: number;
  teamName: string | null;
  passedTech: string | null;
  costReport: number | null;
  costPrototype: number | null;
  costPenalty: number | null;
  costRemarks: string | null;
  designPenalty: number | null;
  designScore: number | null;
  designRemarks: string | null;
  bpPenalty: number | null;
  bpScore: number | null;
  bpRemarks: string | null;
}

export interface DynamicRun {
  event: string | null;
  status: string | null;
  position: number | null;
  correctedTime: number | null;
  rawTime: number | null;
  majorPenalty: string | null;
  minorPenalty: string | null;
  distance: {
    value: number | null;
    unit: string | null;
  };
}

export interface DynamicsData {
  carNumber: number;
  teamName: string | null;
  runs: DynamicRun[];
}

export interface LapRecord {
  lapNumber: number | null;
  passedAt: string | null;
  segmentTime: number | null;
  lapTime: number | null;
}

export interface RaceContext {
  flagStatus: string | null;
  raceTime: string | null;
  leaderCarInfo: string | null;
  leaderLaps: number | null;
  lastUpdated: string | null;
}

export interface EnduranceData {
  carNumber: number;
  teamName: string | null;
  lapCount: number | null;
  position: number | null;
  bestLapTime: number | null;
  secondBestLapTime: number | null;
  averageLapTime: number | null;
  mostRecentLapTime: number | null;
  secondMostRecentLapTime: number | null;
  thirdMostRecentLapTime: number | null;
  lastCheckpoint: string | null;
  gapToNext: number | null;
  diffToLeader: number | null;
  laps: LapRecord[];
}
