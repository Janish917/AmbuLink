export interface PriorityConfig {
  rank: number; // 1 (highest) to 6 (lowest)
  preemptionScore: number; // 0 to 100
  policeIntensity: number; // 0 to 10
  corridorWeight: number; // sorting weight
  baseSpeed: number; // km/h baseline
  codeName: string;
}

export class EmergencyPriorityManager {
  private static configs: Record<string, PriorityConfig> = {
    'Cardiac Arrest': { rank: 1, preemptionScore: 98, policeIntensity: 9, corridorWeight: 100, baseSpeed: 75, codeName: 'CARDIAC' },
    'Severe Trauma': { rank: 2, preemptionScore: 88, policeIntensity: 8, corridorWeight: 80, baseSpeed: 68, codeName: 'TRAUMA' },
    'Stroke Emergency': { rank: 3, preemptionScore: 78, policeIntensity: 6, corridorWeight: 65, baseSpeed: 62, codeName: 'STROKE' },
    'ICU Transfer': { rank: 4, preemptionScore: 60, policeIntensity: 4, corridorWeight: 45, baseSpeed: 52, codeName: 'ICU' },
    'Highway Collision': { rank: 5, preemptionScore: 50, policeIntensity: 5, corridorWeight: 35, baseSpeed: 48, codeName: 'HIGHWAY' },
    'Non-Critical Transport': { rank: 6, preemptionScore: 25, policeIntensity: 1, corridorWeight: 10, baseSpeed: 40, codeName: 'TRANSPORT' }
  };

  static getPriorityConfig(type: string): PriorityConfig {
    return this.configs[type] || { rank: 6, preemptionScore: 25, policeIntensity: 1, corridorWeight: 10, baseSpeed: 40, codeName: 'TRANSPORT' };
  }

  static comparePriority(typeA: string, typeB: string): number {
    const configA = this.getPriorityConfig(typeA);
    const configB = this.getPriorityConfig(typeB);
    return configA.rank - configB.rank; // Lower rank values sorted first
  }
}
