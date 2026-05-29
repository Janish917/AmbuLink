import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import emergencyRoutes from './routes/emergency';
import workforceRoutes from './routes/workforce';
import simulationRoutes from './routes/simulation';
import coordinatorRoutes from './routes/coordinator';
import complianceRoutes from './routes/compliance';
import hospitalRoutes from './routes/hospital';
import { EmergencySessionService } from './services/EmergencySessionService';
import { SessionRecordingService, sessionRerouted, sessionPreemptedSignals } from './services/SessionRecordingService';
import { PredictiveReroutingService } from './services/PredictiveReroutingService';
import { StabilityEngineService } from './services/StabilityEngineService';
import { ScenarioSimulationService } from './services/ScenarioSimulationService';
import { AmbulanceCoordinationService } from './services/AmbulanceCoordinationService';
import { CompliancePredictionService } from './services/CompliancePredictionService';
import { HospitalLoadBalancerService } from './services/HospitalLoadBalancerService';
import { GlobalEmergencyStateManager } from './services/GlobalEmergencyStateManager';

dotenv.config();

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL
  ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      process.env.FRONTEND_URL
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

app.use(cors({
  origin: process.env.FRONTEND_URL
  ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      process.env.FRONTEND_URL
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/hospital', hospitalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'SAPS Backend is running' });
});

// Socket.io for Realtime Tracking
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start_emergency', async (data) => {
    console.log('Emergency started:', data);
    
    // Create actual session using dynamic emergency corridor configurations
    const start: [number, number] = [28.6139, 77.2090];
    const end: [number, number] = [28.6250, 77.2250];
    
    const mode = data.mode || 'STANDARD';
    const manualRadius = data.manualRadius ? Number(data.manualRadius) : undefined;
    const severity = data.severity ? Number(data.severity) : 4;
    
    try {
      let activeDriverId = 'dummy-driver-id';
      const driverUser = await prisma.user.findFirst({
        where: { role: 'DRIVER' }
      });
      if (driverUser) {
        activeDriverId = driverUser.id;
      }

      const result = await EmergencySessionService.activateEmergency(
        activeDriverId, 
        start, 
        end, 
        severity,
        mode,
        manualRadius,
        io
      );

      // Broadcast the enriched payload to traffic control and police dashboards
      io.emit('emergency_alert', {
        ...data,
        id: result.session.id,
        severity: result.session.severity,
        emergencyMode: result.session.emergencyMode,
        corridorRadius: result.session.corridorRadius,
        adaptiveReason: result.session.adaptiveReason,
        publicAlertRadius: result.session.publicAlertRadius,
        policeAlertRadius: result.session.policeAlertRadius,
        signalAlertRadius: result.session.signalAlertRadius,
        corridorEfficiencyScore: result.session.corridorEfficiencyScore,
        simulation: result.simulationData,
        humanDelay: result.humanResponseProfile,
        timeline: result.timeline
      });
    } catch(err) {
      console.error('Error starting emergency:', err);
      // Fallback emit if db fails
      io.emit('emergency_alert', data);
    }
  });

  socket.on('location_update', (data) => {
    // data should contain { sessionId, lat, lng, etaMins }
    io.emit('location_update', data);
  });

  socket.on('report_obstruction', async (data) => {
    // data: { sessionId, type, lat, lng, details }
    try {
      await SessionRecordingService.triggerManualObstruction(
        data.sessionId,
        data.type,
        Number(data.lat || 28.6160),
        Number(data.lng || 77.2140),
        data.details || null,
        io
      );
    } catch (err) {
      console.error('Failed to handle manual obstruction socket:', err);
    }
  });

  socket.on('police_activate_alternate', async (data) => {
    const { sessionId } = data;
    try {
      if (!sessionRerouted[sessionId]) {
        sessionRerouted[sessionId] = true;
        const routes = PredictiveReroutingService.generateAlternativeRoutes();
        const newEta = 8;
        const oldEta = 11;

        await prisma.emergencySession.update({
          where: { id: sessionId },
          data: {
            routePolyline: routes.backup.polyline,
            reroutesCount: 1,
            etaExpected: newEta,
            expectedTimeSavedMin: 3.0,
            routeStability: 90.0,
            rerouteProbability: 10.0,
            congestionRisk: 'LOW',
          }
        });

        await prisma.rerouteHistory.create({
          data: {
            sessionId,
            reason: 'Manual Traffic Police Override: Forced alternate corridor activation.',
            oldRoutePoints: routes.active.polyline,
            newRoutePoints: routes.backup.polyline,
            oldEta,
            newEta,
          }
        });

        await prisma.emergencyEventLog.create({
          data: {
            sessionId,
            eventType: 'REROUTE_ENGAGED',
            description: 'Corridor reroute forced by Traffic Police command center override. Alternate Route engaged.',
          }
        });

        await StabilityEngineService.logRerouteTrigger(sessionId, 'MANUAL', 'Forced alternate corridor activation via command center override');
        await StabilityEngineService.logPoliceIntervention(sessionId, 'ACTIVATE_ALTERNATE', 'Forced transition to backup route (Janpath Bypass)');

        io.emit('reroute_triggered', {
          sessionId,
          newPolyline: routes.backup.polyline,
          newEta,
          reason: 'Forced Traffic Police Override'
        });
        console.log(`[Police Override] Forced alternate corridor for session ${sessionId}`);
      }
    } catch (err) {
      console.error('Failed to activate alternate corridor:', err);
    }
  });

  socket.on('police_override_priority', async (data) => {
    const { sessionId } = data;
    try {
      await StabilityEngineService.logPoliceIntervention(sessionId, 'OVERRIDE_PRIORITY', 'Corridor clearance priority set to MAXIMUM.');
      
      await prisma.emergencySession.update({
        where: { id: sessionId },
        data: {
          routeStability: 98.0,
          congestionRisk: 'LOW',
          estimatedDelayIncrease: 0,
          emergencyPressureScore: 10.0,
        }
      });

      await prisma.emergencyEventLog.create({
        data: {
          sessionId,
          eventType: 'PRIORITY_OVERRIDE',
          description: 'Traffic Command Center engaged maximum clearance priority. Civilian lane clearance enforced.',
        }
      });

      io.emit('telemetry_update', {
        sessionId,
        routeStability: 98.0,
        rerouteProbability: 5.0,
        congestionRisk: 'LOW',
        estimatedDelayIncrease: 0,
        emergencyPressureScore: 10.0,
        status: 'PRIORITY_BOOSTED'
      });
      
      console.log(`[Police Override] Enforced priority for session ${sessionId}`);
    } catch (err) {
      console.error('Failed to override priority:', err);
    }
  });

  socket.on('police_force_preemption', async (data) => {
    const { sessionId } = data;
    try {
      sessionPreemptedSignals[sessionId] = [
        'Connaught Place Signal 1',
        'Connaught Place Signal 2',
        'Connaught Place Signal 3'
      ];

      await StabilityEngineService.logPoliceIntervention(sessionId, 'FORCE_PREEMPTION', 'All traffic signals on route forced to GREEN HELD');

      await prisma.emergencyEventLog.create({
        data: {
          sessionId,
          eventType: 'ALL_SIGNALS_PREEMPTED',
          description: 'Manual command override: All signals along active emergency path locked to green held sequence.',
        }
      });

      io.emit('signal_preemption', { sessionId, signalName: 'Connaught Place Signal 1', status: 'GREEN_HELD' });
      io.emit('signal_preemption', { sessionId, signalName: 'Connaught Place Signal 2', status: 'GREEN_HELD' });
      io.emit('signal_preemption', { sessionId, signalName: 'Connaught Place Signal 3', status: 'GREEN_HELD' });

      console.log(`[Police Override] Forced signal preemption for all signals in session ${sessionId}`);
    } catch (err) {
      console.error('Failed to force signal preemption:', err);
    }
  });

  socket.on('police_increase_radius', async (data) => {
    const { sessionId } = data;
    try {
      const session = await prisma.emergencySession.findUnique({
        where: { id: sessionId },
        select: { corridorRadius: true }
      });

      if (session) {
        const newCorridorRadius = session.corridorRadius + 500;
        const newPublicRadius = Math.round(newCorridorRadius * 0.3);
        const newSignalRadius = Math.round(newCorridorRadius * 0.7);
        const newPoliceRadius = Math.round(newCorridorRadius * 1.3);

        await prisma.emergencySession.update({
          where: { id: sessionId },
          data: {
            corridorRadius: newCorridorRadius,
            publicAlertRadius: newPublicRadius,
            signalAlertRadius: newSignalRadius,
            policeAlertRadius: newPoliceRadius
          }
        });

        await StabilityEngineService.logPoliceIntervention(
          sessionId, 
          'INCREASE_RADIUS', 
          `Emergency corridor radius expanded to ${newCorridorRadius}m`
        );

        await prisma.emergencyEventLog.create({
          data: {
            sessionId,
            eventType: 'CORRIDOR_EXPANDED',
            description: `Manual override: Corridor radius expanded by 500m to secure larger perimeter. New radius: ${newCorridorRadius}m.`,
          }
        });

        io.emit('corridor_radius_updated', {
          sessionId,
          corridorRadius: newCorridorRadius,
          publicAlertRadius: newPublicRadius,
          signalAlertRadius: newSignalRadius,
          policeAlertRadius: newPoliceRadius
        });

        console.log(`[Police Override] Expanded corridor radius for session ${sessionId} to ${newCorridorRadius}m`);
      }
    } catch (err) {
      console.error('Failed to increase corridor radius:', err);
    }
  });

  socket.on('start_simulation', async (data) => {
    try {
      await ScenarioSimulationService.initializeSimulation(
        data.scenarioName || 'Citywide Accident',
        Number(data.intensity || 5),
        Number(data.ambulanceCount || 2),
        data.aiAggression || 'MEDIUM',
        Number(data.speedMultiplier || 1),
        io
      );
    } catch (err) {
      console.error('Failed to start simulation:', err);
    }
  });

  socket.on('pause_simulation', () => {
    ScenarioSimulationService.pauseSimulation();
  });

  socket.on('resume_simulation', () => {
    ScenarioSimulationService.resumeSimulation();
  });

  socket.on('reset_simulation', () => {
    ScenarioSimulationService.stopSimulation();
    ScenarioSimulationService.logEvent('Simulation reset by operator.');
    io.emit('simulation_reset');
  });

  socket.on('adjust_intensity', (data) => {
    ScenarioSimulationService.adjustIntensity(Number(data.intensity || 5));
  });

  socket.on('adjust_speed', (data) => {
    ScenarioSimulationService.adjustSpeed(Number(data.speedMultiplier || 1));
  });

  socket.on('deploy_police', (data) => {
    ScenarioSimulationService.deployPoliceToSector(String(data.sectorId));
  });

  socket.on('start_fleet_coordination', async (data) => {
    try {
      await AmbulanceCoordinationService.initializeFleet(
        Number(data.ambulanceCount || 3),
        Number(data.speedMultiplier || 1),
        io
      );
    } catch (err) {
      console.error('Failed to start fleet coordination:', err);
    }
  });

  socket.on('pause_fleet_coordination', () => {
    AmbulanceCoordinationService.pauseFleet();
  });

  socket.on('resume_fleet_coordination', () => {
    AmbulanceCoordinationService.resumeFleet();
  });

  socket.on('adjust_fleet_speed', (data) => {
    AmbulanceCoordinationService.adjustSpeed(Number(data.speedMultiplier || 1));
  });

  socket.on('reset_fleet_coordination', () => {
    AmbulanceCoordinationService.stopFleet();
    AmbulanceCoordinationService.logEvent('STABILIZED', 'Fleet coordination reset by command operator.');
    io.emit('fleet_reset');
  });

  socket.on('deploy_escort', (data) => {
    AmbulanceCoordinationService.deployPoliceToSector(String(data.sectorId));
  });

  // Compliance Simulation Sockets
  socket.on('start_compliance_run', async (data) => {
    try {
      await CompliancePredictionService.initializeRun(Number(data.speedMultiplier || 1), io);
    } catch (err) {
      console.error('Failed to start compliance run:', err);
    }
  });

  socket.on('pause_compliance_run', () => {
    CompliancePredictionService.pauseRun();
  });

  socket.on('resume_compliance_run', () => {
    CompliancePredictionService.resumeRun();
  });

  socket.on('adjust_compliance_speed', (data) => {
    CompliancePredictionService.adjustSpeed(Number(data.speedMultiplier || 1));
  });

  socket.on('reset_compliance_run', () => {
    CompliancePredictionService.stopRun();
    CompliancePredictionService.logAlert('Compliance prediction run reset by operator.');
    io.emit('compliance_reset');
  });

  socket.on('deploy_compliance_police', (data) => {
    CompliancePredictionService.deployPolice(String(data.sectorId));
  });

  socket.on('deploy_enforcement', (data) => {
    CompliancePredictionService.deployPolice(String(data.sectorId));
  });

  socket.on('escalate_alerts', (data) => {
    CompliancePredictionService.logAlert(`AI Action Escalation: Sector alert intensity raised. Target Area Radius: ${data?.radius || 1500}m.`);
    io.emit('compliance_alert_escalated', { radius: data?.radius || 1500 });
  });

  socket.on('enforce_corridor', (data) => {
    CompliancePredictionService.logAlert(`Central Command: Corridor compliance enforcement activated. Physical lanes locked for emergency vehicles.`);
    io.emit('compliance_corridor_enforced');
  });

  // Hospital Load Balancer Simulation Sockets
  socket.on('start_hospital_run', async (data) => {
    try {
      await HospitalLoadBalancerService.initializeRun(Number(data.speedMultiplier || 1), io);
    } catch (err) {
      console.error('Failed to start hospital run:', err);
    }
  });

  socket.on('pause_hospital_run', () => {
    HospitalLoadBalancerService.pauseRun();
  });

  socket.on('resume_hospital_run', () => {
    HospitalLoadBalancerService.resumeRun();
  });

  socket.on('adjust_hospital_speed', (data) => {
    HospitalLoadBalancerService.adjustSpeed(Number(data.speedMultiplier || 1));
  });

  socket.on('reset_hospital_run', () => {
    HospitalLoadBalancerService.stopRun();
    HospitalLoadBalancerService.logAlert('Hospital load balancing run reset by operator.');
    io.emit('hospital_reset');
  });

  socket.on('trigger_hospital_overload', (data) => {
    HospitalLoadBalancerService.forceOverload(String(data.hospitalId));
  });

  // Global Sync Simulation Sockets
  socket.on('start_global_simulation', async (data) => {
    try {
      await GlobalEmergencyStateManager.initializeSimulation(
        data.scenarioName || 'Standard Emergency Run',
        Number(data.speedMultiplier || 1),
        io
      );
    } catch (err) {
      console.error('Failed to start global simulation:', err);
    }
  });

  socket.on('pause_global_simulation', () => {
    GlobalEmergencyStateManager.pauseSimulation();
  });

  socket.on('resume_global_simulation', () => {
    GlobalEmergencyStateManager.resumeSimulation();
  });

  socket.on('reset_global_simulation', () => {
    GlobalEmergencyStateManager.stopSimulation();
    GlobalEmergencyStateManager.logEvent('Simulation reset by operator.');
    io.emit('global_simulation_reset');
  });

  socket.on('deploy_global_police', (data) => {
    GlobalEmergencyStateManager.deployPolice(String(data.sectorId));
  });

  socket.on('overload_global_hospital', (data) => {
    GlobalEmergencyStateManager.forceOverload(String(data.hospitalId));
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
