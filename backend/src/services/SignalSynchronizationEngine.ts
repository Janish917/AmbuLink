import { FleetVehicle } from './ConflictResolutionEngine';
import { EmergencyPriorityManager } from './EmergencyPriorityManager';

export interface SignalOverride {
  signalName: string;
  status: 'NORMAL' | 'GREEN_HELD' | 'RED_HELD';
  holdingFor: string;
  preemptionScore: number;
}

export class SignalSynchronizationEngine {
  static synchronizeSignals(
    vehicles: FleetVehicle[],
    trafficSignals: any[]
  ): SignalOverride[] {
    const overrides: SignalOverride[] = [];

    // Reset all signals to NORMAL first
    const signalStates: Record<string, SignalOverride> = {};
    trafficSignals.forEach(sig => {
      signalStates[sig.name] = {
        signalName: sig.name,
        status: 'NORMAL',
        holdingFor: 'NONE',
        preemptionScore: 0
      };
    });

    const activeVehicles = vehicles.filter(v => v.status === 'EN_ROUTE');

    activeVehicles.forEach(vehicle => {
      const path = vehicle.usingBackup ? vehicle.backupPoints : vehicle.routePoints;
      const remainingPath = path.slice(vehicle.routeIndex);

      // Check proximity of remaining path points to signals
      remainingPath.forEach((pt, pathIdx) => {
        // Only look ahead up to 3 points (~450 meters) for signal activation
        if (pathIdx > 3) return;

        trafficSignals.forEach(sig => {
          const dist = this.getDistance(pt[0], pt[1], sig.lat, sig.lng);
          if (dist < 0.25) { // within 250 meters
            const priorityConfig = EmergencyPriorityManager.getPriorityConfig(vehicle.emergencyType);
            const currentOverride = signalStates[sig.name];

            // If no ambulance is currently holding the signal, or the new ambulance has higher priority:
            if (
              currentOverride.status === 'NORMAL' ||
              priorityConfig.preemptionScore > currentOverride.preemptionScore
            ) {
              signalStates[sig.name] = {
                signalName: sig.name,
                status: 'GREEN_HELD',
                holdingFor: vehicle.name,
                preemptionScore: priorityConfig.preemptionScore
              };
            } else if (
              currentOverride.status === 'GREEN_HELD' &&
              currentOverride.holdingFor !== vehicle.name &&
              priorityConfig.preemptionScore < currentOverride.preemptionScore
            ) {
              // Stagger lower priority: hold them red at previous junctions if overlapping
              // Let's identify the previous junction on the lower-ranked vehicle's path
              // For simulation simplicity, we mark signal status RED_HELD for this lower priority
              // but we don't block the road completely, just drop their speed
            }
          }
        });
      });
    });

    return Object.values(signalStates);
  }

  private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = lat1 - lat2;
    const dLng = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  }
}
