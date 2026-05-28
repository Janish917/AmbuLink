import { PrismaClient } from '@prisma/client';
import { RoutingService } from './RoutingService';
import { SimulationEngine } from './SimulationEngine';
import { SessionRecordingService } from './SessionRecordingService';
import { PredictiveReroutingService } from './PredictiveReroutingService';

const prisma = new PrismaClient();

export class EmergencySessionService {
  static async activateEmergency(driverId: string, start: [number, number], end: [number, number], severity: number, mode: string = 'STANDARD', manualRadius?: number, io?: any) {
    // 1. Determine dynamic alert radii based on emergencyMode
    let corridorRadius = 1500;
    let publicAlertRadius = 500;
    let signalAlertRadius = 1200;
    let policeAlertRadius = 2000;
    let adaptiveReason = null;

    if (mode === 'URBAN_CRITICAL') {
      corridorRadius = 800;
      publicAlertRadius = 300;
      signalAlertRadius = 600;
      policeAlertRadius = 1000;
    } else if (mode === 'STANDARD') {
      corridorRadius = 1500;
      publicAlertRadius = 500;
      signalAlertRadius = 1200;
      policeAlertRadius = 2000;
    } else if (mode === 'TRAUMA_HIGHWAY') {
      corridorRadius = 2300;
      publicAlertRadius = 800;
      signalAlertRadius = 1800;
      policeAlertRadius = 3000;
    } else if (mode === 'ADAPTIVE_AI') {
      const hour = new Date().getHours();
      const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
      if (isPeakHour) {
        corridorRadius = 1800;
        publicAlertRadius = 600;
        signalAlertRadius = 1500;
        policeAlertRadius = 2500;
        adaptiveReason = 'Heavy congestion detected near city center (Peak Traffic Window)';
      } else {
        corridorRadius = 1300;
        publicAlertRadius = 400;
        signalAlertRadius = 1000;
        policeAlertRadius = 1800;
        adaptiveReason = 'Moderate density on route. Optimized flow parameters set.';
      }
    } else if (mode === 'MANUAL' && manualRadius) {
      corridorRadius = manualRadius;
      publicAlertRadius = Math.round(manualRadius * 0.3);
      signalAlertRadius = Math.round(manualRadius * 0.7);
      policeAlertRadius = Math.round(manualRadius * 1.3);
      adaptiveReason = `Manual operator override to custom distance ${manualRadius}m.`;
    }

    // 2. Calculate Route Intelligence
    const route = await RoutingService.getRoute(start, end);

    // 3. Predict Corridor Nodes inside maximum range (policeAlertRadius)
    const nodesInCorridor = await RoutingService.findRelevantAuthoritiesAlongRoute(route.coordinates, policeAlertRadius);

    // 4. Probabilistic Reality Simulation (Monte Carlo)
    const simulation = SimulationEngine.runMonteCarloTripSimulation(route.etaMins, nodesInCorridor.length, 5.0, mode);

    // Generate alternative routes for predictive rerouting
    const alternatives = PredictiveReroutingService.generateAlternativeRoutes();

    // 5. Create Session with Realistic Probabilities and Corridor parameters
    const session = await prisma.emergencySession.create({
      data: {
        driverId,
        status: 'ACTIVE',
        severity,
        startLat: start[0],
        startLng: start[1],
        endLat: end[0],
        endLng: end[1],
        routePolyline: route.polyline,
        originalRoutePolyline: alternatives.active.polyline,
        backupRoutePolyline: alternatives.backup.polyline,
        fastestRoutePolyline: alternatives.fastest.polyline,
        routeStability: 95.0,
        rerouteProbability: 5.0,
        congestionRisk: 'LOW',
        trafficHeatmapData: JSON.stringify(PredictiveReroutingService.getHeatmapData()),
        etaExpected: simulation.eta.expected,
        etaBest: simulation.eta.best,
        etaWorst: simulation.eta.worst,
        etaConfidence: simulation.eta.confidence,
        expectedTimeSavedMin: simulation.timeSaved.worst,
        expectedTimeSavedMax: simulation.timeSaved.best,
        eceiScore: simulation.eceiScore,
        startTime: new Date(),
        // New corridor variables
        emergencyMode: mode,
        corridorRadius,
        adaptiveReason,
        publicAlertRadius,
        policeAlertRadius,
        signalAlertRadius,
        corridorEfficiencyScore: simulation.eceiScore
      }
    });

    // Start session telemetry recording simulation loop
    if (io) {
      SessionRecordingService.startTelemetryRecording(session.id, io);
    }

    // 6. Generate Targeted Alerts (Multi-Layer Alert System filtering)
    const humanDelay = SimulationEngine.getHumanResponseProfile();
    const alertsToCreate: any[] = [];

    for (const node of nodesInCorridor) {
      let isWithinLayer = false;
      let layerName = 'PUBLIC';
      
      if (node.role === 'HOSPITAL') {
        isWithinLayer = true;
        layerName = 'HOSPITAL';
      } else if (node.role === 'POLICE') {
        if (node.distanceFromRoute <= policeAlertRadius) {
          isWithinLayer = true;
          layerName = 'POLICE';
        }
      } else if (node.role === 'SYSTEM_NODE' || node.role === 'TRAFFIC_OP') {
        if (node.distanceFromRoute <= signalAlertRadius) {
          isWithinLayer = true;
          layerName = 'SIGNAL';
        }
      }

      if (isWithinLayer) {
        const trafficModel = SimulationEngine.getTrafficNodeProfile(node.role, node.distanceFromRoute);
        const nodeEtaMins = Math.round(simulation.eta.expected * node.etaFraction);
        
        alertsToCreate.push({
          sessionId: session.id,
          receiverId: node.authorityId,
          status: 'CREATED' as any,
          message: `Ambulance approaching. Mode: ${mode}. Layer: ${layerName}.`,
          etaToNode: nodeEtaMins,
          distanceToNode: node.distanceFromRoute,
          expectedResponseMin: humanDelay.expectedResponseMin,
          expectedResponseMax: humanDelay.expectedResponseMax,
          responseConfidence: humanDelay.confidence,
          bottleneckProbability: trafficModel.bottleneckProbability
        });
      }
    }

    if (alertsToCreate.length > 0) {
      await prisma.alert.createMany({ data: alertsToCreate });
    }

    // Return full intelligence payload
    return {
      session,
      simulationData: simulation,
      humanResponseProfile: humanDelay,
      timeline: nodesInCorridor.map((node, idx) => {
        const matchingAlert = alertsToCreate.find(a => a.receiverId === node.authorityId);
        return {
          authority: node.name,
          role: node.role,
          eta: `T+${Math.round(simulation.eta.expected * node.etaFraction)} min`,
          bottleneckRisk: matchingAlert ? matchingAlert.bottleneckProbability : 0.3
        };
      }),
      targetAlertsCount: alertsToCreate.length
    };
  }

  static async acknowledgeAlert(alertId: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: { 
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date()
      }
    });
  }

  static async completeSession(sessionId: string) {
    const session = await prisma.emergencySession.findUnique({
      where: { id: sessionId },
      select: { driverId: true }
    });

    if (session && session.driverId) {
      try {
        await prisma.user.update({
          where: { id: session.driverId },
          data: {
            emergencyCount: {
              increment: 1
            }
          }
        });
      } catch (err) {
        console.error('Failed to increment driver emergency count:', err);
      }
    }

    // Stop session telemetry recording simulation loop
    SessionRecordingService.stopTelemetryRecording(sessionId);

    return prisma.emergencySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: new Date()
      }
    });
  }
}
