import { SectorBehaviorAnalyzer } from './SectorBehaviorAnalyzer';

export interface SectorLiveCompliance {
  id: string;
  name: string;
  complianceScore: number; // 0 to 100
  obstructionScore: number; // 0 to 100
  delayRiskScore: number; // 0 to 100
  pressure: number; // density
}

export class CivilianComplianceEngine {
  static getLiveComplianceGrid(
    sectors: any[],
    hour: number = 18
  ): SectorLiveCompliance[] {
    return sectors.map(s => {
      const stats = SectorBehaviorAnalyzer.calculateDynamicSectorStats(
        s.id,
        s.density,
        s.blocked || false,
        s.hasPolice || false,
        hour
      );

      return {
        id: s.id,
        name: s.name,
        complianceScore: stats.compliance,
        obstructionScore: stats.obstructionProbability,
        delayRiskScore: stats.delayRisk,
        pressure: s.density
      };
    });
  }

  static calculateComplianceKPIs(grid: SectorLiveCompliance[]) {
    if (grid.length === 0) {
      return {
        cityComplianceIndex: 75,
        cooperationIndex: 75,
        delayProbability: 20
      };
    }

    const totalCompliance = grid.reduce((acc, s) => acc + s.complianceScore, 0);
    const avgCompliance = totalCompliance / grid.length;

    // City compliance index (average of all sectors)
    const cityComplianceIndex = Math.round(avgCompliance);

    // Cooperation % is weighted higher in administrative zones
    const administrativeSectors = grid.filter(s => {
      const p = SectorBehaviorAnalyzer.getProfile(s.id);
      return p.profile === 'ADMINISTRATIVE';
    });
    const marketSectors = grid.filter(s => {
      const p = SectorBehaviorAnalyzer.getProfile(s.id);
      return p.profile === 'MARKET';
    });

    const adminAvg = administrativeSectors.reduce((acc, s) => acc + s.complianceScore, 0) / (administrativeSectors.length || 1);
    const marketAvg = marketSectors.reduce((acc, s) => acc + s.complianceScore, 0) / (marketSectors.length || 1);

    const cooperationIndex = Math.round((adminAvg * 0.6 + marketAvg * 0.4));

    // Delay probability is inverse to city compliance plus market blockages
    const delayProb = Math.min(95, Math.max(5, 100 - cityComplianceIndex + (marketSectors.filter(s => s.pressure > 65).length * 10)));

    return {
      cityComplianceIndex,
      cooperationIndex: Math.round(cooperationIndex),
      delayProbability: Math.round(delayProb)
    };
  }
}
