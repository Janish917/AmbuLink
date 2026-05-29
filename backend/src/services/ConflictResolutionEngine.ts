import { EmergencyPriorityManager } from './EmergencyPriorityManager';

export interface FleetVehicle {
  id: string;
  name: string;
  emergencyType: string;
  currentLat: number;
  currentLng: number;
  routePoints: [number, number][];
  backupPoints: [number, number][];
  routeIndex: number;
  usingBackup: boolean;
  status: string;
  etaMins: number;
  speed: number;
}

export interface CollisionConflict {
  id: string;
  vehicleA: string;
  vehicleB: string;
  conflictLocation: string;
  lat: number;
  lng: number;
  etaOffsetMins: number;
  actionTaken: string;
}

export class ConflictResolutionEngine {
  static checkCorridorOverlaps(
    vehicles: FleetVehicle[],
    trafficSignals: any[]
  ): {
    conflicts: CollisionConflict[];
    forceRerouteIds: string[];
  } {
    const conflicts: CollisionConflict[] = [];
    const forceRerouteIds: string[] = [];

    const active = vehicles.filter(v => v.status === 'EN_ROUTE');
    if (active.length < 2) return { conflicts, forceRerouteIds };

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const vA = active[i];
        const vB = active[j];

        const pathA = vA.usingBackup ? vA.backupPoints : vA.routePoints;
        const pathB = vB.usingBackup ? vB.backupPoints : vB.routePoints;

        // remaining path check
        const remA = pathA.slice(vA.routeIndex);
        const remB = pathB.slice(vB.routeIndex);

        let overlapPoint: [number, number] | null = null;
        let indexA = -1;
        let indexB = -1;

        // Find intersection within 200m
        for (let idxA = 0; idxA < remA.length; idxA++) {
          for (let idxB = 0; idxB < remB.length; idxB++) {
            const dist = this.getDistance(remA[idxA][0], remA[idxA][1], remB[idxB][0], remB[idxB][1]);
            if (dist < 0.2) {
              overlapPoint = remA[idxA];
              indexA = idxA;
              indexB = idxB;
              break;
            }
          }
          if (overlapPoint) break;
        }

        if (overlapPoint) {
          // Calculate ETA differences at intersection
          const etaToOverlapA = indexA * 1.5; // estimated minutes
          const etaToOverlapB = indexB * 1.5;
          const etaDifference = Math.abs(etaToOverlapA - etaToOverlapB);

          // If they cross the intersection within a 4-minute window, it's a conflict!
          if (etaDifference < 4.0) {
            // Find closest signal
            let closestSignalName = 'Main Crossing';
            let minDist = Infinity;
            trafficSignals.forEach(sig => {
              const d = this.getDistance(overlapPoint![0], overlapPoint![1], sig.lat, sig.lng);
              if (d < minDist) {
                minDist = d;
                closestSignalName = sig.name;
              }
            });

            // Priority manager comparison
            const priorityComp = EmergencyPriorityManager.comparePriority(vA.emergencyType, vB.emergencyType);
            const highRank = priorityComp <= 0 ? vA : vB;
            const lowRank = priorityComp <= 0 ? vB : vA;

            let actionTaken = '';
            if (!lowRank.usingBackup && lowRank.backupPoints.length > 0) {
              // Reroute low priority
              forceRerouteIds.push(lowRank.id);
              actionTaken = `RE-ALLOCATE CORRIDOR: Rerouted ${lowRank.name} (${lowRank.emergencyType}) to bypass. Assigned exclusive lane to ${highRank.name} (${highRank.emergencyType}) at ${closestSignalName}.`;
            } else {
              actionTaken = `SIGNAL STAGGERING: Sync offset junctions. Holding green signal at ${closestSignalName} for ${highRank.name}. Staggering ${lowRank.name} speed profile.`;
            }

            conflicts.push({
              id: `conflict-${vA.id}-${vB.id}`,
              vehicleA: vA.name,
              vehicleB: vB.name,
              conflictLocation: closestSignalName,
              lat: overlapPoint[0],
              lng: overlapPoint[1],
              etaOffsetMins: Math.round(etaDifference * 10) / 10,
              actionTaken
            });
          }
        }
      }
    }

    return { conflicts, forceRerouteIds };
  }

  private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = lat1 - lat2;
    const dLng = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  }
}
