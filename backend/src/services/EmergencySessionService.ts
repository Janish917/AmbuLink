import { PrismaClient } from '@prisma/client';
import { RoutingService } from './RoutingService';
import { SimulationEngine } from './SimulationEngine';

const prisma = new PrismaClient();

export class EmergencySessionService {
  static async activateEmergency(driverId: string, start: [number, number], end: [number, number], severity: number) {
    // 1. Calculate Route Intelligence
    const route = await RoutingService.getRoute(start, end);

    // 2. Predict Corridor Nodes (Spatial Target)
    const nodesInCorridor = await RoutingService.findRelevantAuthoritiesAlongRoute(route.coordinates);

    // 3. Probabilistic Reality Simulation (Monte Carlo)
    const simulation = SimulationEngine.runMonteCarloTripSimulation(route.etaMins, nodesInCorridor.length, 5.0);

    // 4. Create Session with Realistic Probabilities
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
        etaExpected: simulation.eta.expected,
        etaBest: simulation.eta.best,
        etaWorst: simulation.eta.worst,
        etaConfidence: simulation.eta.confidence,
        expectedTimeSavedMin: simulation.timeSaved.worst,
        expectedTimeSavedMax: simulation.timeSaved.best,
        eceiScore: simulation.eceiScore,
        startTime: new Date(),
      }
    });

    // 5. Generate Targeted Alerts with Human Response Delays
    const humanDelay = SimulationEngine.getHumanResponseProfile();

    const alertsToCreate = nodesInCorridor.map(node => {
      const trafficModel = SimulationEngine.getTrafficNodeProfile(node.role, node.distanceFromRoute);
      const nodeEtaMins = Math.round(simulation.eta.expected * node.etaFraction);
      
      return {
        sessionId: session.id,
        receiverId: node.authorityId,
        status: 'CREATED' as any,
        message: `Ambulance approaching. Severity: ${severity}.`,
        etaToNode: nodeEtaMins,
        distanceToNode: node.distanceFromRoute,
        expectedResponseMin: humanDelay.expectedResponseMin,
        expectedResponseMax: humanDelay.expectedResponseMax,
        responseConfidence: humanDelay.confidence,
        bottleneckProbability: trafficModel.bottleneckProbability
      };
    });

    if (alertsToCreate.length > 0) {
      await prisma.alert.createMany({ data: alertsToCreate });
    }

    // Return full intelligence payload
    return {
      session,
      simulationData: simulation,
      humanResponseProfile: humanDelay,
      timeline: nodesInCorridor.map((node, idx) => ({
        authority: node.name,
        role: node.role,
        eta: `T+${Math.round(simulation.eta.expected * node.etaFraction)} min`,
        bottleneckRisk: alertsToCreate[idx].bottleneckProbability
      })),
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
    return prisma.emergencySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: new Date()
      }
    });
  }
}
