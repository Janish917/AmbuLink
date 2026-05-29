export interface SectorBehavior {
  id: string;
  name: string;
  profile: 'RESIDENTIAL' | 'MARKET' | 'ADMINISTRATIVE' | 'TRANSIT';
  baseCompliance: number; // 0 to 100
  roadWidthLimit: number; // meters (simulated narrowing)
  crowdIntensity: number; // 0 to 10
  peakHourResistance: number; // modifier
}

export class SectorBehaviorAnalyzer {
  private static sectorProfiles: Record<string, SectorBehavior> = {
    '1': { id: '1', name: 'Connaught Place Center', profile: 'TRANSIT', baseCompliance: 65, roadWidthLimit: 14, crowdIntensity: 7, peakHourResistance: 1.3 },
    '2': { id: '2', name: 'Janpath North', profile: 'MARKET', baseCompliance: 48, roadWidthLimit: 9, crowdIntensity: 8, peakHourResistance: 1.6 },
    '3': { id: '3', name: 'Barakhamba Road', profile: 'ADMINISTRATIVE', baseCompliance: 80, roadWidthLimit: 18, crowdIntensity: 3, peakHourResistance: 1.1 },
    '4': { id: '4', name: 'Ashoka Road', profile: 'RESIDENTIAL', baseCompliance: 75, roadWidthLimit: 12, crowdIntensity: 2, peakHourResistance: 1.2 },
    '5': { id: '5', name: 'India Gate Circle', profile: 'TRANSIT', baseCompliance: 70, roadWidthLimit: 22, crowdIntensity: 5, peakHourResistance: 1.4 },
    '6': { id: '6', name: 'Tilak Marg', profile: 'RESIDENTIAL', baseCompliance: 72, roadWidthLimit: 12, crowdIntensity: 4, peakHourResistance: 1.2 },
    '7': { id: '7', name: 'Pragati Maidan', profile: 'TRANSIT', baseCompliance: 58, roadWidthLimit: 15, crowdIntensity: 6, peakHourResistance: 1.5 },
    '8': { id: '8', name: 'Mandir Marg', profile: 'RESIDENTIAL', baseCompliance: 78, roadWidthLimit: 10, crowdIntensity: 3, peakHourResistance: 1.1 },
    '9': { id: '9', name: 'Panchkuian Road', profile: 'MARKET', baseCompliance: 42, roadWidthLimit: 7, crowdIntensity: 9, peakHourResistance: 1.7 },
    '10': { id: '10', name: 'Minto Road', profile: 'MARKET', baseCompliance: 45, roadWidthLimit: 8, crowdIntensity: 8, peakHourResistance: 1.6 },
    '11': { id: '11', name: 'Parliament Street', profile: 'ADMINISTRATIVE', baseCompliance: 85, roadWidthLimit: 16, crowdIntensity: 2, peakHourResistance: 1.0 },
    '12': { id: '12', name: 'Chanakyapuri', profile: 'ADMINISTRATIVE', baseCompliance: 90, roadWidthLimit: 20, crowdIntensity: 1, peakHourResistance: 0.9 }
  };

  static getProfile(sectorId: string): SectorBehavior {
    return this.sectorProfiles[sectorId] || {
      id: sectorId,
      name: `Sector ${sectorId}`,
      profile: 'RESIDENTIAL',
      baseCompliance: 65,
      roadWidthLimit: 12,
      crowdIntensity: 4,
      peakHourResistance: 1.2
    };
  }

  static calculateDynamicSectorStats(
    sectorId: string,
    density: number,
    isBlocked: boolean,
    hasPolice: boolean,
    hour: number = 18 // peak hour by default
  ) {
    const p = this.getProfile(sectorId);
    
    // Determine isPeak
    const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    const peakPenalty = isPeak ? p.peakHourResistance * 8 : 0;

    // Obstruction Likelihood
    // Low compliance, narrow streets, and high density amplify obstruction risk
    let obsChance = (100 - p.baseCompliance) * 0.4 + (20 - p.roadWidthLimit) * 2 + density * 0.35;
    if (isBlocked) obsChance = 100;
    if (hasPolice) obsChance = Math.max(5, obsChance - 50);

    // Compliance Score
    let compliance = p.baseCompliance - (density * 0.3) - peakPenalty;
    if (hasPolice) compliance += 35; // Escort / Police improves compliance
    if (isBlocked) compliance -= 20;

    // Delay risk
    let delayRisk = (100 - compliance) * 0.8 + (density * 0.2);

    return {
      compliance: Math.round(Math.min(Math.max(compliance, 5), 100)),
      obstructionProbability: Math.round(Math.min(Math.max(obsChance, 0), 100)),
      delayRisk: Math.round(Math.min(Math.max(delayRisk, 0), 100))
    };
  }
}
