import { FleetVehicle, CollisionConflict } from './ConflictResolutionEngine';
import { SignalOverride } from './SignalSynchronizationEngine';

export interface FleetReport {
  efficiencyScore: number;
  averageDelaySec: number;
  rerouteCount: number;
  corridorUtilization: number;
  conflictProbability: number;
  signalOverridesCount: number;
  tacticalSummary: string;
  timelineData: Array<{
    tick: number;
    time: string;
    efficiency: number;
    utilization: number;
    conflicts: number;
  }>;
}

export class FleetAnalyticsService {
  static calculateLiveMetrics(
    vehicles: FleetVehicle[],
    conflicts: CollisionConflict[],
    signals: SignalOverride[],
    sectorsCount: number = 12
  ) {
    const activeVehicles = vehicles.filter(v => v.status === 'EN_ROUTE');
    
    // 1. Corridor Utilization % (estimated based on path sizes and sectors occupied)
    let occupiedSectorsCount = 0;
    if (activeVehicles.length > 0) {
      // Each active vehicle occupies roughly 2 sectors along its path
      occupiedSectorsCount = Math.min(sectorsCount, activeVehicles.length * 2.5);
    }
    const utilization = Math.round((occupiedSectorsCount / sectorsCount) * 100);

    // 2. Conflict Probability %
    // Rises as ambulance count increases and intersections overlap
    let conflictProb = 0;
    if (activeVehicles.length >= 2) {
      conflictProb = Math.min(95, activeVehicles.length * 20 + conflicts.length * 15);
    } else if (activeVehicles.length === 1) {
      conflictProb = 8;
    }
    
    // 3. Count signal overrides
    const overridesCount = signals.filter(s => s.status !== 'NORMAL').length;

    return {
      utilization: Math.min(100, utilization),
      conflictProbability: Math.min(100, conflictProb),
      signalOverridesCount: overridesCount
    };
  }

  static generateReport(
    logs: any[],
    vehicleCount: number,
    finalDelaySec: number,
    finalReroutes: number,
    avgUtilization: number
  ): FleetReport {
    // Count specific log types
    let conflictCount = 0;
    let preemptionCount = 0;
    logs.forEach(l => {
      if (l.logType === 'CONFLICT_DETECTED') conflictCount++;
      if (l.logType === 'SIGNAL_PREEMPTED') preemptionCount++;
    });

    // Efficiency math
    let efficiency = 100 - (finalDelaySec * 0.05) - (conflictCount * 5) - (finalReroutes * 2);
    efficiency = Math.round(Math.min(Math.max(efficiency, 20), 100));

    // Compile timeline points (synthetic projection from history logs)
    const ticksCount = Math.max(10, Math.ceil(logs.length / 1.5));
    const timelineData = [];
    for (let t = 0; t <= ticksCount; t++) {
      const progressFraction = t / ticksCount;
      const currentUtilization = Math.round(avgUtilization * Math.sin(progressFraction * Math.PI));
      const currentConflicts = progressFraction > 0.3 && progressFraction < 0.7 ? Math.min(2, Math.floor(vehicleCount * 0.5)) : 0;
      
      timelineData.push({
        tick: t,
        time: `${Math.round(t * 1.5)}s`,
        efficiency: Math.round(Math.min(100, efficiency + (100 - efficiency) * (1 - progressFraction))),
        utilization: Math.max(0, currentUtilization),
        conflicts: currentConflicts
      });
    }

    const tacticalSummary = `Central Coordination Operations finalized. Central Fleet Director synchronized ${vehicleCount} emergency corridors. Average transit latency capped at ${finalDelaySec} seconds. Overall network efficiency rating stands at ${efficiency}%, with average corridor utilization reaching ${avgUtilization}%. AI engine successfully resolved ${conflictCount} overlapping intersection conflicts and managed ${preemptionCount} signal sync preemptions.`;

    return {
      efficiencyScore: efficiency,
      averageDelaySec: finalDelaySec,
      rerouteCount: finalReroutes,
      corridorUtilization: avgUtilization,
      conflictProbability: conflictCount > 0 ? 80 : 15,
      signalOverridesCount: preemptionCount,
      tacticalSummary,
      timelineData
    };
  }
}
