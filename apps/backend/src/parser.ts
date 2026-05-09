import * as cheerio from "cheerio";
import {
  CarData,
  DynamicRun,
  DynamicsData,
  EnduranceData,
  FullData,
  LapRecord,
  RaceContext,
  StaticData,
} from "./models";

interface PollOptions {
  static: boolean;
  dynamics: boolean;
  endurance: boolean;
}

const BASE_URL = "https://mobile.bajasae.net/";
type TabType = "statics" | "dynamics" | "endurance";

const carNumbers = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 20, 21, 22, 23, 24, 25, 26,
  27, 29, 34, 39, 41, 46, 51, 52, 54, 59, 63, 64, 65, 69, 74, 76, 77, 84, 85,
  88, 90, 93, 94, 101, 104, 109, 110, 111, 114, 115, 118, 120, 125, 128, 130,
  133, 137, 143, 148, 149, 153, 159, 167, 171, 172, 174, 178, 179, 181, 182,
  183, 187, 190,
];

const initialCarData: CarData[] = carNumbers.map((number) => ({
  carNumber: number,
  teamName: null,
  staticData: null,
  dynamicsData: null,
  enduranceData: null,
}));

export const initialFullData: FullData = {
  cars: initialCarData,
  raceContext: null,
  lastUpdated: null,
};

const parseText = ($: cheerio.CheerioAPI, selector: any) => {
  return $(selector).text().trim() || null;
};

const dynamicEventCanonicalNames: Record<string, string> = {
  // The scoring model currently treats Hill Climb as the traction event.
  "hill climb": "Traction",
  "rock crawl": "Rock Crawl",
  acceleration: "Acceleration",
  maneuverability: "Maneuverability",
};

const normalizeDynamicEventName = (eventName: string | null) => {
  if (eventName === null) {
    return null;
  }

  const trimmed = eventName.trim();
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  return dynamicEventCanonicalNames[normalized] ?? trimmed;
};

const parseNumber = ($: cheerio.CheerioAPI, selector: any) => {
  const text =
    $(selector)
      .text()
      .trim()
      .replace(/\u00a0/g, "")
      .trim() || null;

  if (text === null) {
    return null;
  }

  if (text.toLowerCase().includes("not yet")) {
    return null;
  }

  const num = parseFloat(text);
  return isNaN(num) ? null : num;
};

const parseDate = ($: cheerio.CheerioAPI, selector: string) => {
  const text = parseText($, selector);
  if (text === null) {
    return null;
  }

  const date = new Date(text);
  return isNaN(date.getTime()) ? null : date;
};

/** Parse "MM:SS.mmm" or "SS.mmm" or plain seconds string → total seconds */
export function parseTime(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const s = raw.trim();
  if (!s || s === "&nbsp;") {
    return null;
  }

  // MM:SS.mmm
  const mmss = s.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (mmss) {
    return parseInt(mmss[1]) * 60 + parseFloat(mmss[2]);
  }

  // plain seconds
  const plain = parseFloat(s);
  return isNaN(plain) ? null : plain;
}

/** Parse "285.000 Ft" or "23 Gates" or "0 " → { value, unit } */
function parseDistance(raw: string | null): {
  value: number | null;
  unit: string | null;
} {
  if (!raw) {
    return { value: null, unit: null };
  }
  const s = raw.trim();
  if (!s || s === "0" || s === "0 ") {
    return { value: 0, unit: null };
  }

  const match = s.match(/^([\d.]+)\s*(.*)$/);
  if (!match) {
    return { value: null, unit: null };
  }

  const value = parseFloat(match[1]);
  const unit = match[2].trim() || null;
  return { value: isNaN(value) ? null : value, unit };
}

/** Get the last updated time from the results site */
export const getLastDataUpdate = async () => {
  const res = await fetch(BASE_URL);
  const text = await res.text();
  const $ = cheerio.load(text);

  return parseDate($, "#lblSiteLocationUpdate");
};

/** Create a Cheerio parser for the given car number and tab type */
const createParser = async (carNumber: number, tab: TabType) => {
  const url = `${BASE_URL}MyResults.aspx?carnum=${carNumber}&tab=${tab}`;

  const res = await fetch(url);
  const text = await res.text();
  return cheerio.load(text);
};

const parseStaticData = async (carNumber: number) => {
  const $ = await createParser(carNumber, "statics");

  const data: StaticData = {
    carNumber: carNumber,
    teamName: parseText($, "#MainContent_lblTeamAndSchoolName"),
    passedTech: parseText($, "#MainContent_lblPassedTech"),
    costReport: parseNumber($, "#MainContent_lblCostReportScore"),
    costPrototype: parseNumber($, "#MainContent_lblCostEvalScore"),
    costPenalty: parseNumber($, "#MainContent_lblCostPenalty"),
    costRemarks: parseText($, "#MainContent_lblCostMessage"),
    designPenalty: parseNumber($, "#MainContent_lblDesignReportPenalty"),
    designScore: parseNumber($, "#MainContent_lblDesignEvalScore"),
    designRemarks: parseText($, "#MainContent_lblDesignMessage"),
    bpPenalty: parseNumber($, "#MainContent_lblPresentationPenalty"),
    bpScore: parseNumber($, "#MainContent_lblPresentationEvalScore"),
    bpRemarks: parseText($, "#MainContent_lblPresentationMessage"),
  };

  return data;
};

const parseDynamicsData = async (carNumber: number): Promise<DynamicsData> => {
  const $ = await createParser(carNumber, "dynamics");

  const runs: DynamicRun[] = [];

  $("#MainContent_GridViewDynamicResults tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");

    runs.push({
      event: normalizeDynamicEventName(parseText($, cells[0])),
      status: parseText($, cells[1]),
      position: parseNumber($, cells[2]),
      correctedTime: parseNumber($, cells[3]),
      rawTime: parseTime(parseText($, cells[4])),
      majorPenalty: parseText($, cells[5]),
      minorPenalty: parseText($, cells[6]),
      distance: parseDistance(parseText($, cells[7])),
    });
  });

  return {
    carNumber: carNumber,
    teamName: parseText($, "#MainContent_lblTeamAndSchoolName"),
    runs,
  };
};

const parseRaceContext = async (): Promise<RaceContext> => {
  // Data is the same for all cars
  const $ = await createParser(carNumbers[0], "endurance");

  return {
    flagStatus: parseText($, "#MainContent_lblFlagStatus"),
    raceTime: parseText($, "#MainContent_lblRaceTime"),
    leaderCarInfo: parseText($, "#MainContent_lblLeader"),
    leaderLaps: parseNumber($, "#MainContent_lblLeaderLaps"),
    lastUpdated: parseText($, "#MainContent_lblEndLastUpdateTime"),
  };
};

const parseEnduranceData = async (
  carNumber: number,
): Promise<EnduranceData> => {
  const $ = await createParser(carNumber, "endurance");

  const laps: LapRecord[] = [];
  $("#MainContent_PanelEnduranceLaps table tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 4) {
      return;
    }

    laps.push({
      passedAt: parseText($, cells[1]),
      segmentTime: parseTime(parseText($, cells[2])),
      lapTime: parseTime(parseText($, cells[3])),
    });
  });

  return {
    carNumber,
    teamName: parseText($, "#MainContent_lblTeamAndSchoolName"),
    lapCount: parseNumber($, "#MainContent_lblEndLapCount"),
    position: parseNumber($, "#MainContent_lblEndPosition"),
    bestLapTime: parseTime(parseText($, "#MainContent_lblBestLapTime")),
    secondBestLapTime: parseTime(
      parseText($, "#MainContent_lblSecondBestLapTime"),
    ),
    averageLapTime: parseTime(parseText($, "#MainContent_lblAverageLapTime")),
    mostRecentLapTime: parseTime(
      parseText($, "#MainContent_lblMostRecentLapTime"),
    ),
    secondMostRecentLapTime: parseTime(
      parseText($, "#MainContent_lblSecondLastLapTime"),
    ),
    thirdMostRecentLapTime: parseTime(
      parseText($, "#MainContent_lblThirdLastLapTime"),
    ),
    lastCheckpoint: parseText($, "#MainContent_lblLastTimeLine"),
    gapToNext: parseTime(parseText($, "#MainContent_lblGap")),
    diffToLeader: parseTime(parseText($, "#MainContent_lblDifference")),
    laps: laps.filter((l) => l.lapTime !== null),
  };
};

export const parseAllData = async (
  oldData: FullData,
  pollOptions: PollOptions,
): Promise<FullData> => {
  const newData: FullData = {
    cars: [],
    raceContext: await parseRaceContext(),
    lastUpdated: null,
  };

  for (const data of oldData.cars) {
    const staticData = pollOptions.static
      ? await parseStaticData(data.carNumber)
      : data.staticData;

    const dynamicsData = pollOptions.dynamics
      ? await parseDynamicsData(data.carNumber)
      : data.dynamicsData;

    const enduranceData = pollOptions.endurance
      ? await parseEnduranceData(data.carNumber)
      : data.enduranceData;

    newData.cars.push({
      carNumber: data.carNumber,
      teamName:
        data.teamName ||
        staticData?.teamName ||
        dynamicsData?.teamName ||
        enduranceData?.teamName ||
        null,
      staticData,
      dynamicsData,
      enduranceData,
    });
  }
  return newData;
};
