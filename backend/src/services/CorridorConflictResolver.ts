import { SimulatedAmbulance } from './EmergencyAIController';

export interface CorridorConflict {
  id: string;
  ambulanceA: string; // name
  ambulanceB: string; // name
  priorityA: number;
  priorityB: number;
  locationName: string;
  lat: number;
  lng: number;
  resolved: boolean;
  resolutionText: string;
}

export class CorridorConflictResolver {
  static resolveConflicts(
    ambulances: SimulatedAmbulance[],
    trafficSignals: any[]
  ): {
    conflicts: CorridorConflict[];
    signalSyncList: Array<{ signalName: string, status: string, holdingFor: string }>;
    rerouteAmbulanceIds: string[];
  } {
    const conflicts: CorridorConflict[] = [];
    const signalSyncList: Array<{ signalName: string, status: string, holdingFor: string }> = [];
    const rerouteAmbulanceIds: string[] = [];

    // Filter en route ambulances
    const active = ambulances.filter(a => a.status === 'EN_ROUTE');
    if (active.length < 2) {
      // With 1 or 0 ambulances, allocate standard preemption signals to the active ambulance
      if (active.length === 1) {
        const currentAmb = active[0];
        const nextSignal = this.getNextSignalOnPath(currentAmb, trafficSignals);
        if (nextSignal) {
          signalSyncList.push({
            signalName: nextSignal.name,
            status: 'GREEN_HELD',
            holdingFor: currentAmb.name
          });
        }
      }
      return { conflicts, signalSyncList, rerouteAmbulanceIds };
    }

    // Check every pair for corridor overlap
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const ambA = active[i];
        const ambB = active[j];

        const pathA = ambA.usingBackup ? ambA.backupPoints : ambA.routePoints;
        const pathB = ambB.usingBackup ? ambB.backupPoints : ambB.routePoints;

        // Check if remaining path points intersect (i.e. close distance)
        const remA = pathA.slice(ambA.routeIndex);
        const remB = pathB.slice(ambB.routeIndex);

        let overlapPoint: [number, number] | null = null;
        let distThreshold = 0.25; // ~250m overlap detection threshold

        for (const ptA of remA) {
          for (const ptB of remB) {
            const dist = this.getDistance(ptA[0], ptA[1], ptB[0], ptB[1]);
            if (dist < distThreshold) {
              overlapPoint = ptA;
              break;
            }
          }
          if (overlapPoint) break;
        }

        if (overlapPoint) {
          // Identify closest traffic signal to the overlap point
          let closestSignal = trafficSignals[0];
          let minDist = Infinity;
          trafficSignals.forEach(sig => {
            const dist = this.getDistance(overlapPoint![0], overlapPoint![1], sig.lat, sig.lng);
            if (dist < minDist) {
              minDist = dist;
              closestSignal = sig;
            }
          });

          // Determine priorities
          // Lower priority value = higher rank. priority 1 = Cardiac, 2 = Trauma, 3 = Pediatric, 4 = Standard
          const priorityRank = ambA.priority <= ambB.priority ? { high: ambA, low: ambB } : { high: ambB, low: ambA };

          // Build conflict resolution
          const conflictId = `conflict-${ambA.id}-${ambB.id}`;
          let resolutionText = '';
          
          if (!priorityRank.low.usingBackup && priorityRank.low.backupPoints.length > 0) {
            // Option 1: Reroute lower priority ambulance
            resolutionText = `AI Redirect: Rerouted ${priorityRank.low.name} (${priorityRank.low.type}) to bypass to avoid overlap with high-priority ${priorityRank.high.name} (${priorityRank.high.type}) at ${closestSignal?.name || 'Junction'}.`;
            rerouteAmbulanceIds.push(priorityRank.low.id);
          } else {
            // Option 2: Preemption hold offset
            resolutionText = `Signal Synchronization: Lock green corridor for ${priorityRank.high.name} at ${closestSignal?.name}. Offset ${priorityRank.low.name} entry flow sequence.`;
            signalSyncList.push({
              signalName: closestSignal.name,
              status: 'GREEN_HELD',
              holdingFor: priorityRank.high.name
            });
            // Also preempt secondary signal for the low priority to stagger their arrivals
            const nextLowSignal = this.getNextSignalOnPath(priorityRank.low, trafficSignals);
            if (nextLowSignal && nextLowSignal.name !== closestSignal.name) {
              signalSyncList.push({
                signalName: nextLowSignal.name,
                status: 'RED_HELD', // Hold the lower priority ambulance at previous red junction
                holdingFor: priorityRank.high.name // Locked for high priority
              });
            }
          }

          conflicts.push({
            id: conflictId,
            ambulanceA: ambA.name,
            ambulanceB: ambB.name,
            priorityA: ambA.priority,
            priorityB: ambB.priority,
            locationName: closestSignal?.name || 'Intersection Overlap',
            lat: overlapPoint[0],
            lng: overlapPoint[1],
            resolved: true,
            resolutionText
          });
        }
      }
    }

    // Allocate default green lights for non-conflicted en route ambulances
    active.forEach(amb => {
      // If this ambulance is NOT involved in a red-hold or reroute conflict, give it green priority signals
      const isInConflictReroute = rerouteAmbulanceIds.includes(amb.id);
      const hasGreenSync = signalSyncList.some(s => s.holdingFor === amb.name);

      if (!isInConflictReroute && !hasGreenSync) {
        const nextSig = this.getNextSignalOnPath(amb, trafficSignals);
        if (nextSig) {
          signalSyncList.push({
            signalName: nextSig.name,
            status: 'GREEN_HELD',
            holdingFor: amb.name
          });
        }
      }
    });

    return { conflicts, signalSyncList, rerouteAmbulanceIds };
  }

  private static getNextSignalOnPath(amb: SimulatedAmbulance, signals: any[]): any | null {
    const path = amb.usingBackup ? amb.backupPoints : amb.routePoints;
    const remaining = path.slice(amb.routeIndex);
    if (remaining.length === 0) return null;

    // Find first signal that is close to the remaining path points
    for (const pt of remaining) {
      for (const sig of signals) {
        const dist = this.getDistance(pt[0], pt[1], sig.lat, sig.lng);
        if (dist < 0.3) { // within 300m
          return sig;
        }
      }
    }
    return null;
  }

  private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = lat1 - lat2;
    const dLng = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  }
}
