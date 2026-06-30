import { deriveFieldStats } from './scoring-service';
import { TeamResults } from '../models/scoring-models';

describe('deriveFieldStats', () => {
  it('creates time scoring when all specialty runs are completed', () => {
    const stats = deriveFieldStats([
      {
        carNumber: 1,
        specialtyRunMap: new Map([['Traction', { time: 10, distance: 100 }]]),
      },
      {
        carNumber: 2,
        specialtyRunMap: new Map([['Traction', { time: 12, distance: 100 }]]),
      },
    ] as TeamResults[]);

    expect(stats.specialty.get('Traction')).toEqual({
      scoring: 'time',
      tMin: 10,
    });
  });

  it('creates distance scoring when no specialty runs are completed', () => {
    const stats = deriveFieldStats([
      {
        carNumber: 1,
        specialtyRunMap: new Map([['Rock Crawl', { time: 0, distance: 40 }]]),
      },
      {
        carNumber: 2,
        specialtyRunMap: new Map([['Rock Crawl', { distance: 75 }]]),
      },
    ] as TeamResults[]);

    expect(stats.specialty.get('Rock Crawl')).toEqual({
      scoring: 'distance',
      dMin: 0,
      dMax: 75,
    });
  });

  it('creates hybrid scoring when some specialty runs are completed and some are distance-only', () => {
    const stats = deriveFieldStats([
      {
        carNumber: 1,
        specialtyRunMap: new Map([['Traction', { time: 10, distance: 100 }]]),
      },
      {
        carNumber: 2,
        specialtyRunMap: new Map([['Traction', { time: 0, distance: 60 }]]),
      },
      {
        carNumber: 3,
        specialtyRunMap: new Map([['Traction', { time: 12, distance: 100 }]]),
      },
    ] as TeamResults[]);

    const traction = stats.specialty.get('Traction');

    expect(traction).toEqual({
      scoring: 'hybrid',
      tMin: 10,
      courseLen: 100,
      minCompleterScore: jasmine.any(Number),
    });
  });

  it('handles multiple specialty events independently', () => {
    const stats = deriveFieldStats([
      {
        carNumber: 1,
        specialtyRunMap: new Map([
          ['Traction', { time: 10, distance: 100 }],
          ['Rock Crawl', { time: 0, distance: 40 }],
        ]),
      },
      {
        carNumber: 2,
        specialtyRunMap: new Map([
          ['Traction', { time: 12, distance: 100 }],
          ['Rock Crawl', { distance: 80 }],
        ]),
      },
    ] as TeamResults[]);

    expect(stats.specialty.get('Traction')).toEqual({
      scoring: 'time',
      tMin: 10,
    });

    expect(stats.specialty.get('Rock Crawl')).toEqual({
      scoring: 'distance',
      dMin: 0,
      dMax: 80,
    });
  });

  it('derives accel, maneuverability, and endurance stats', () => {
    const stats = deriveFieldStats([
      {
        carNumber: 1,
        accelerationTime: 4,
        maneuverabilityTime: 60,
        enduranceLaps: 5,
        specialtyRunMap: new Map(),
      },
      {
        carNumber: 2,
        accelerationTime: 5,
        maneuverabilityTime: 55,
        enduranceLaps: 8,
        specialtyRunMap: new Map(),
      },
    ] as TeamResults[]);

    expect(stats.accel).toEqual({ tMin: 4 });
    expect(stats.maneuv).toEqual({ tMin: 55 });
    expect(stats.endurance).toEqual({
      lMax: 8,
      lMin: 5,
    });
  });
});