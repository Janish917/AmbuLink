import polyline from '@mapbox/polyline';

export interface RouteOption {
  name: string;
  coordinates: [number, number][];
  polyline: string;
  etaMins: number;
  trafficPressure: number; // 0 to 100
  efficiency: number; // 0 to 100
}

export class PredictiveReroutingService {
  // Hardcoded route templates that represent New Delhi paths
  static getActiveRouteCoords(): [number, number][] {
    return [
      [28.6139, 77.2090], // CP Center
      [28.6145, 77.2110], // Signal 1
      [28.6160, 77.2140], // Signal 2
      [28.6190, 77.2180], // Signal 3
      [28.6250, 77.2250], // City General Hospital
    ];
  }

  static getBackupRouteCoords(): [number, number][] {
    return [
      [28.6139, 77.2090],
      [28.6175, 77.2095], // Outer Circle West
      [28.6210, 77.2150], // Janpath North
      [28.6235, 77.2200], // Barakhamba
      [28.6250, 77.2250],
    ];
  }

  static getFastestRouteCoords(): [number, number][] {
    return [
      [28.6139, 77.2090],
      [28.6110, 77.2130], // Ashoka Road South
      [28.6150, 77.2220], // India Gate Circle
      [28.6220, 77.2260], // Tilak Marg
      [28.6250, 77.2250],
    ];
  }

  static generateAlternativeRoutes(): { active: RouteOption; backup: RouteOption; fastest: RouteOption } {
    const activeCoords = this.getActiveRouteCoords();
    const backupCoords = this.getBackupRouteCoords();
    const fastestCoords = this.getFastestRouteCoords();

    return {
      active: {
        name: 'CP Corridor Route (Primary)',
        coordinates: activeCoords,
        polyline: polyline.encode(activeCoords),
        etaMins: 11,
        trafficPressure: 78,
        efficiency: 65,
      },
      backup: {
        name: 'Janpath Bypass (Alternative)',
        coordinates: backupCoords,
        polyline: polyline.encode(backupCoords),
        etaMins: 9,
        trafficPressure: 45,
        efficiency: 82,
      },
      fastest: {
        name: 'Ashoka Express Corridor (Fastest)',
        coordinates: fastestCoords,
        polyline: polyline.encode(fastestCoords),
        etaMins: 7,
        trafficPressure: 22,
        efficiency: 94,
      },
    };
  }

  static analyzeRouteRisk(
    elapsedTicks: number,
    emergencyMode: string
  ): {
    routeStability: number;
    rerouteProbability: number;
    congestionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedDelayIncrease: number;
    emergencyPressureScore: number;
  } {
    // Stability deteriorates as the ambulance encounters simulated delays.
    // Let's create a predictable timeline based on ticks (each tick representing a simulation step)
    // Between tick 4 and 7, we'll simulate a bottleneck event where risk spikes, triggering the reroute.
    let baseStability = 95;
    let baseRerouteProb = 5;
    let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let delayIncrease = 0;
    let pressure = 20;

    if (elapsedTicks >= 3 && elapsedTicks < 6) {
      baseStability = 75;
      baseRerouteProb = 35;
      risk = 'MEDIUM';
      delayIncrease = 2;
      pressure = 48;
    } else if (elapsedTicks >= 6 && elapsedTicks < 8) {
      baseStability = 45; // Below the threshold (70%)
      baseRerouteProb = 85;
      risk = 'HIGH';
      delayIncrease = 4;
      pressure = 84;
    } else if (elapsedTicks >= 8) {
      // After reroute occurs, stabilization happens
      baseStability = 92;
      baseRerouteProb = 8;
      risk = 'LOW';
      delayIncrease = 0;
      pressure = 25;
    }

    // Add slight variance for dynamism
    const variance = Math.random() * 4 - 2;
    const finalStability = Math.min(Math.max(baseStability + variance, 0), 100);
    const finalProb = Math.min(Math.max(baseRerouteProb + (Math.random() * 6 - 3), 0), 100);
    const finalPressure = Math.min(Math.max(pressure + (Math.random() * 10 - 5), 0), 100);

    return {
      routeStability: Math.round(finalStability * 10) / 10,
      rerouteProbability: Math.round(finalProb * 10) / 10,
      congestionRisk: risk,
      estimatedDelayIncrease: delayIncrease,
      emergencyPressureScore: Math.round(finalPressure * 10) / 10,
    };
  }

  static getHeatmapData(): Array<{ lat: number; lng: number; intensity: number }> {
    // Static-ish but dynamic heatmap coordinates in New Delhi around the routes
    return [
      { lat: 28.6145, lng: 77.2110, intensity: 0.8 }, // CP Signal 1 - Hot
      { lat: 28.6160, lng: 77.2140, intensity: 0.9 }, // CP Signal 2 - Very Hot
      { lat: 28.6190, lng: 77.2180, intensity: 0.75 }, // CP Signal 3 - Hot
      { lat: 28.6120, lng: 77.2100, intensity: 0.3 }, // South CP - Cool
      { lat: 28.6235, lng: 77.2200, intensity: 0.4 }, // Outer Circle - Warm
    ];
  }
}
