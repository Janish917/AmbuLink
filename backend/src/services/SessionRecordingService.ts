import { PrismaClient } from '@prisma/client';
import { PredictiveReroutingService } from './PredictiveReroutingService';
import { StabilityEngineService } from './StabilityEngineService';
import polyline from '@mapbox/polyline';

const prisma = new PrismaClient();

// Keep track of active recording intervals
const activeIntervals: Record<string, NodeJS.Timeout> = {};
const sessionTicks: Record<string, number> = {};
export const sessionRerouted: Record<string, boolean> = {};
export const sessionPreemptedSignals: Record<string, string[]> = {};

export class SessionRecordingService {
  static async startTelemetryRecording(sessionId: string, io: any) {
    if (activeIntervals[sessionId]) {
      clearInterval(activeIntervals[sessionId]);
    }

    sessionTicks[sessionId] = 0;
    sessionRerouted[sessionId] = false;
    sessionPreemptedSignals[sessionId] = [];

    // Pre-calculate routes
    const routes = PredictiveReroutingService.generateAlternativeRoutes();
    const activePath = routes.active.coordinates;
    const backupPath = routes.backup.coordinates;
    
    // Save routes and initial values to database session
    await prisma.emergencySession.update({
      where: { id: sessionId },
      data: {
        originalRoutePolyline: routes.active.polyline,
        backupRoutePolyline: routes.backup.polyline,
        fastestRoutePolyline: routes.fastest.polyline,
        routeStability: 95.0,
        rerouteProbability: 5.0,
        congestionRisk: 'LOW',
        trafficHeatmapData: JSON.stringify(PredictiveReroutingService.getHeatmapData()),
      },
    });

    // Write initial log
    await prisma.emergencyEventLog.create({
      data: {
        sessionId,
        eventType: 'EMERGENCY_INITIATED',
        description: 'Emergency session activated. Primary CP Corridor Route engaged.',
      },
    });

    console.log(`[Recording] Started telemetry simulation for session ${sessionId}`);

    const interval = setInterval(async () => {
      try {
        const tick = sessionTicks[sessionId];
        if (tick === undefined) {
          clearInterval(interval);
          return;
        }

        const isRerouted = sessionRerouted[sessionId];
        const currentPath = isRerouted ? backupPath : activePath;

        // Interpolate current coordinate based on tick (out of 12 ticks total)
        const totalTicks = 12;
        if (tick >= totalTicks) {
          // Arrived at destination
          clearInterval(interval);
          delete activeIntervals[sessionId];
          delete sessionTicks[sessionId];
          delete sessionRerouted[sessionId];

          await prisma.emergencySession.update({
            where: { id: sessionId },
            data: {
              status: 'COMPLETED',
              endTime: new Date(),
              currentLat: currentPath[currentPath.length - 1][0],
              currentLng: currentPath[currentPath.length - 1][1],
            },
          });

          await prisma.emergencyEventLog.create({
            data: {
              sessionId,
              eventType: 'EMERGENCY_COMPLETED',
              description: 'Ambulance arrived at Trauma Center destination. Corridor cleared.',
            },
          });

          io.emit('emergency_completed', { sessionId });
          console.log(`[Recording] Completed telemetry simulation for session ${sessionId}`);
          return;
        }

        // Determine current coordinates
        const progressFraction = tick / totalTicks;
        const currentCoordIndex = Math.min(
          Math.floor(progressFraction * currentPath.length),
          currentPath.length - 1
        );
        const nextCoordIndex = Math.min(currentCoordIndex + 1, currentPath.length - 1);
        
        // Linear interpolation between the two points for smooth replay updates
        const factor = (progressFraction * currentPath.length) % 1;
        const lat =
          currentPath[currentCoordIndex][0] +
          (currentPath[nextCoordIndex][0] - currentPath[currentCoordIndex][0]) * factor;
        const lng =
          currentPath[currentCoordIndex][1] +
          (currentPath[nextCoordIndex][1] - currentPath[currentCoordIndex][1]) * factor;

        // Speed & Heading
        const speed = isRerouted ? 75 + Math.random() * 10 : 45 + Math.random() * 15; // Faster on backup path
        const heading = isRerouted ? 120 : 45;

        // Analyze route risk
        const riskAnalysis = PredictiveReroutingService.analyzeRouteRisk(tick, 'STANDARD');

        // Manage signal preemption simulations based on ticks
        if (!sessionPreemptedSignals[sessionId]) {
          sessionPreemptedSignals[sessionId] = [];
        }

        if (tick === 2) {
          if (!sessionPreemptedSignals[sessionId].includes('Connaught Place Signal 1')) {
            sessionPreemptedSignals[sessionId].push('Connaught Place Signal 1');
          }
          await prisma.emergencyEventLog.create({
            data: {
              sessionId,
              eventType: 'SIGNAL_PREEMPTED',
              description: 'Traffic Signal preemption activated at Connaught Place Signal 1. Flow priority locked.',
            },
          });
          io.emit('signal_preemption', { sessionId, signalName: 'Connaught Place Signal 1', status: 'GREEN_HELD' });
        } else if (tick === 4) {
          await prisma.emergencyEventLog.create({
            data: {
              sessionId,
              eventType: 'CONGESTION_SPIKE',
              description: 'Congestion spike detected near Connaught Place Signal 2. Stability dropping.',
            },
          });
        }

        // Count active obstructions in DB
        const activeObstructions = await prisma.obstructionReport.count({
          where: { sessionId }
        });

        // Determine civilian compliance
        let compliance = 85.0;
        if (riskAnalysis.congestionRisk === 'HIGH') compliance = 60.0;
        if (riskAnalysis.congestionRisk === 'LOW') compliance = 90.0;

        // Calculate stability using stability engine
        const stabilityCalculations = StabilityEngineService.calculateStability({
          trafficDensity: riskAnalysis.congestionRisk === 'HIGH' ? 85.0 : riskAnalysis.congestionRisk === 'MEDIUM' ? 55.0 : 20.0,
          ambulanceSpeed: speed,
          signalPreemptionCount: sessionPreemptedSignals[sessionId].length,
          totalSignals: 3,
          civilianCompliance: compliance,
          obstructionCount: activeObstructions,
          rerouteProbability: riskAnalysis.rerouteProbability,
          emergencyPressure: riskAnalysis.emergencyPressureScore
        });

        // Save Telemetry Log
        await prisma.telemetryLog.create({
          data: {
            sessionId,
            lat,
            lng,
            speed,
            heading,
            congestionLevel: riskAnalysis.congestionRisk === 'HIGH' ? 85.0 : riskAnalysis.congestionRisk === 'MEDIUM' ? 55.0 : 20.0,
          },
        });

        // Save Stability metrics to DB
        await StabilityEngineService.logStabilityHistory(
          sessionId,
          stabilityCalculations.stabilityScore,
          stabilityCalculations.congestionRisk,
          stabilityCalculations.signalGridStatus,
          riskAnalysis.rerouteProbability
        );
        await StabilityEngineService.logCongestionSnapshot(
          sessionId,
          riskAnalysis.congestionRisk === 'HIGH' ? 85.0 : riskAnalysis.congestionRisk === 'MEDIUM' ? 55.0 : 20.0,
          stabilityCalculations.congestionRisk
        );
        await StabilityEngineService.logEmergencyPressure(
          sessionId,
          riskAnalysis.emergencyPressureScore
        );

        // EVALUATE REROUTING SYSTEM (Stability threshold below 70%)
        if (!isRerouted && stabilityCalculations.stabilityScore < 70) {
          sessionRerouted[sessionId] = true;
          const oldEta = 11;
          const newEta = 8; // Saved 3 minutes!

          await prisma.emergencySession.update({
            where: { id: sessionId },
            data: {
              routePolyline: routes.backup.polyline,
              reroutesCount: 1,
              etaExpected: newEta,
              expectedTimeSavedMin: 3.0,
            },
          });

          await prisma.rerouteHistory.create({
            data: {
              sessionId,
              reason: 'Severe corridor blockage detected at CP Signal 2',
              oldRoutePoints: routes.active.polyline,
              newRoutePoints: routes.backup.polyline,
              oldEta,
              newEta,
            },
          });

          await StabilityEngineService.logRerouteTrigger(
            sessionId,
            'AUTO',
            'Corridor stability degraded below 70% threshold',
            routes.active.polyline,
            routes.backup.polyline
          );

          await prisma.emergencyEventLog.create({
            data: {
              sessionId,
              eventType: 'REROUTE_ENGAGED',
              description: `Alternative route engaged: Janpath Bypass selected due to high congestion at Signal 2. New ETA: ${newEta} mins.`,
            },
          });

          io.emit('reroute_triggered', {
            sessionId,
            newPolyline: routes.backup.polyline,
            newEta,
            reason: 'Severe corridor blockage detected at CP Signal 2',
          });
          console.log(`[Rerouting] Triggered rerouting for session ${sessionId}`);
        }

        // Update session live location & parameters in DB
        await prisma.emergencySession.update({
          where: { id: sessionId },
          data: {
            currentLat: lat,
            currentLng: lng,
            routeStability: stabilityCalculations.stabilityScore,
            rerouteProbability: riskAnalysis.rerouteProbability,
            congestionRisk: stabilityCalculations.congestionRisk,
          },
        });

        // Broadcast telemetry update via socket
        io.emit('telemetry_update', {
          sessionId,
          lat,
          lng,
          speed,
          heading,
          routeStability: stabilityCalculations.stabilityScore,
          rerouteProbability: riskAnalysis.rerouteProbability,
          congestionRisk: stabilityCalculations.congestionRisk,
          signalGridStatus: stabilityCalculations.signalGridStatus,
          estimatedDelayIncrease: riskAnalysis.estimatedDelayIncrease,
          emergencyPressureScore: riskAnalysis.emergencyPressureScore,
          etaExpected: isRerouted ? 8 : 11,
          tick,
        });

        sessionTicks[sessionId]++;
      } catch (err) {
        console.error(`Error in telemetry interval for session ${sessionId}:`, err);
      }
    }, 1500);

    activeIntervals[sessionId] = interval;
  }

  static stopTelemetryRecording(sessionId: string) {
    if (activeIntervals[sessionId]) {
      clearInterval(activeIntervals[sessionId]);
      delete activeIntervals[sessionId];
    }
    delete sessionTicks[sessionId];
    delete sessionRerouted[sessionId];
    console.log(`[Recording] Stopped telemetry simulation for session ${sessionId}`);
  }

  static async getReplayData(sessionId: string) {
    const session = await prisma.emergencySession.findUnique({
      where: { id: sessionId },
      include: {
        driver: {
          select: { name: true, driverId: true },
        },
        telemetryLogs: {
          orderBy: { timestamp: 'asc' },
        },
        rerouteHistory: {
          orderBy: { timestamp: 'asc' },
        },
        eventLogs: {
          orderBy: { timestamp: 'asc' },
        },
        obstructionReports: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) return null;

    // Compute tactical summaries
    const totalResponseTime = session.endTime && session.startTime 
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : 360; // 6 mins default in seconds

    const expectedDelayPrevented = session.expectedTimeSavedMin ? session.expectedTimeSavedMin * 60 : 180; // 3 mins in seconds

    return {
      session,
      analytics: {
        totalResponseTimeSec: totalResponseTime,
        delayPreventedSec: expectedDelayPrevented,
        reroutesCount: session.reroutesCount,
        averageEfficiency: session.corridorEfficiencyScore || 85.0,
        signalResponseSpeedSec: 12,
        hospitalPrepTimeSec: 150,
      },
    };
  }

  static async triggerManualObstruction(
    sessionId: string,
    type: string,
    lat: number,
    lng: number,
    details: string | null,
    io: any
  ) {
    console.log(`[Obstruction] Manual report received: ${type} at [${lat}, ${lng}]`);

    // 1. Persist Obstruction Report
    await prisma.obstructionReport.create({
      data: {
        sessionId,
        type,
        lat,
        lng,
        details,
      },
    });

    // 2. Log to event logs
    await prisma.emergencyEventLog.create({
      data: {
        sessionId,
        eventType: 'OBSTRUCTION_REPORTED',
        description: `Manual police alert: ${type} reported at CP Corridor junction. Details: ${details || 'None'}`,
      },
    });

    // Notify clients about reported obstruction
    io.emit('obstruction_reported', {
      sessionId,
      type,
      lat,
      lng,
      details,
    });

    // 3. FORCE AI REROUTE if not already rerouted
    if (!sessionRerouted[sessionId]) {
      sessionRerouted[sessionId] = true;
      const oldEta = 11;
      const newEta = 8; // saved 3 mins

      const routes = PredictiveReroutingService.generateAlternativeRoutes();

      await prisma.emergencySession.update({
        where: { id: sessionId },
        data: {
          routePolyline: routes.backup.polyline,
          reroutesCount: 1,
          etaExpected: newEta,
          expectedTimeSavedMin: 3.0,
          routeStability: 35.0,
          rerouteProbability: 98.0,
          congestionRisk: 'HIGH',
          estimatedDelayIncrease: 5,
          emergencyPressureScore: 92.0,
        },
      });

      await prisma.rerouteHistory.create({
        data: {
          sessionId,
          reason: `Manual police override: ${type} roadblock encountered along primary corridor path`,
          oldRoutePoints: routes.active.polyline,
          newRoutePoints: routes.backup.polyline,
          oldEta,
          newEta,
        },
      });

      await prisma.emergencyEventLog.create({
        data: {
          sessionId,
          eventType: 'REROUTE_ENGAGED',
          description: `Alternative route engaged: Janpath Bypass selected dynamically to bypass manual roadblock.`,
        },
      });

      io.emit('reroute_triggered', {
        sessionId,
        newPolyline: routes.backup.polyline,
        newEta,
        reason: `AI Corridor Reroute initiated due to manual ${type} report`,
      });
      
      console.log(`[Rerouting] Forced manual bypass for session ${sessionId}`);
    }
  }
}
