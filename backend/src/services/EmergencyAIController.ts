import { Sector } from './CongestionPropagationEngine';

export interface SimulatedAmbulance {
  id: string;
  name: string;
  priority: number; // 1 (highest) to 4 (lowest)
  type: string; // Cardiac, Trauma, Pediatric, Standard
  currentLat: number;
  currentLng: number;
  routePoints: [number, number][];
  backupPoints: [number, number][];
  routeIndex: number; // current point index
  usingBackup: boolean;
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  etaMins: number;
  speed: number;
  delayAccumulatedSec: number;
  stabilityScore: number;
}

export interface AIRecommendation {
  id: string;
  timestamp: string;
  type: 'WARNING' | 'REROUTE' | 'POLICE_DEPLOY' | 'STABILITY_ALERT';
  message: string;
  sectorId?: string;
  ambulanceId?: string;
  meta?: any;
}

export class EmergencyAIController {
  static analyzeSimulationState(
    ambulances: SimulatedAmbulance[],
    sectors: Sector[],
    aiAggression: 'LOW' | 'MEDIUM' | 'HIGH'
  ): {
    recommendations: AIRecommendation[];
    unstableCorridors: string[];
    failureProbabilities: Record<string, number>;
  } {
    const recommendations: AIRecommendation[] = [];
    const unstableCorridors: string[] = [];
    const failureProbabilities: Record<string, number> = {};

    ambulances.forEach((amb) => {
      if (amb.status === 'ARRIVED') return;

      // Find which sectors this ambulance's route passes through
      const pathSectors = this.getSectorsOnPath(amb.usingBackup ? amb.backupPoints : amb.routePoints, sectors);
      
      // Calculate average congestion of sectors on path
      let totalDensity = 0;
      let blockedCount = 0;
      let maxCongestedSector: Sector | null = null;

      pathSectors.forEach((s) => {
        totalDensity += s.density;
        if (s.blocked) blockedCount++;
        if (!maxCongestedSector || s.density > maxCongestedSector.density) {
          maxCongestedSector = s;
        }
      });

      const avgDensity = pathSectors.length > 0 ? totalDensity / pathSectors.length : 15;
      
      // Calculate failure probability
      let failureProb = avgDensity * 0.6 + blockedCount * 35;
      // Aggression levels shift failure sensitivity
      if (aiAggression === 'HIGH') failureProb *= 1.15;
      if (aiAggression === 'LOW') failureProb *= 0.85;
      
      failureProb = Math.round(Math.min(Math.max(failureProb, 0), 100));
      failureProbabilities[amb.id] = failureProb;

      // Identify unstable corridors
      if (failureProb > 50) {
        unstableCorridors.push(amb.name);
      }

      // Generate warnings & recommendations
      const timeStr = new Date().toLocaleTimeString();

      if (blockedCount > 0 && !amb.usingBackup) {
        recommendations.push({
          id: `rec-${amb.id}-blockage`,
          timestamp: timeStr,
          type: 'REROUTE',
          message: `🚨 Critical blockage detected on active path for ${amb.name}. Recommend IMMEDIATE override to Janpath Bypass corridor!`,
          ambulanceId: amb.id,
          meta: { action: 'AUTO_REROUTE_RECOMMENDED' }
        });
      } else if (failureProb > 65) {
        recommendations.push({
          id: `rec-${amb.id}-high-risk`,
          timestamp: timeStr,
          type: 'STABILITY_ALERT',
          message: `⚠️ Corridor stability for ${amb.name} degraded to ${amb.stabilityScore}%. Failure probability is ${failureProb}%.`,
          ambulanceId: amb.id
        });
      }

      // Predict congestion escalation
      if (maxCongestedSector && (maxCongestedSector as Sector).density > 60) {
        const sectorName = (maxCongestedSector as Sector).name;
        const escal = Math.round(((maxCongestedSector as Sector).density * 0.35) * (aiAggression === 'HIGH' ? 1.4 : 1.0));
        recommendations.push({
          id: `rec-${amb.id}-escalation`,
          timestamp: timeStr,
          type: 'WARNING',
          message: `🧠 AI Predicts: ${sectorName} congestion expected to escalate by +${escal}% within 3 minutes.`,
          ambulanceId: amb.id
        });
      }

      // Suggest police deployment sector
      const policeTarget = pathSectors.find(s => !s.hasPolice && !s.blocked && s.density > 40);
      if (policeTarget) {
        recommendations.push({
          id: `rec-${amb.id}-police`,
          timestamp: timeStr,
          type: 'POLICE_DEPLOY',
          message: `👮 Suggest deploying Police Unit to ${policeTarget.name} (Sector ${policeTarget.id}) to enforce emergency lane preemption.`,
          sectorId: policeTarget.id,
          ambulanceId: amb.id
        });
      }
    });

    return {
      recommendations,
      unstableCorridors,
      failureProbabilities
    };
  }

  // Helper: find sectors close to path coordinates
  private static getSectorsOnPath(points: [number, number][], sectors: Sector[]): Sector[] {
    const list: Sector[] = [];
    sectors.forEach((s) => {
      // Find if any point on path is within ~700 meters of sector center
      const hasClosePoint = points.some(pt => {
        const dist = this.getDistance(pt[0], pt[1], s.lat, s.lng);
        return dist < 0.7; // ~700 meters
      });
      if (hasClosePoint) {
        list.push(s);
      }
    });
    return list;
  }

  private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Simple Euclidean distance in degrees scaled roughly to km
    const dLat = lat1 - lat2;
    const dLng = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  }
}
