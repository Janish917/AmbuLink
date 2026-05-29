import { PrismaClient } from '@prisma/client';
import { CongestionPropagationEngine, Sector } from './CongestionPropagationEngine';
import { EmergencyAIController, SimulatedAmbulance, AIRecommendation } from './EmergencyAIController';
import { CorridorConflictResolver, CorridorConflict } from './CorridorConflictResolver';
import { ResponseAnalyticsService } from './ResponseAnalyticsService';

const prisma = new PrismaClient();

export class ScenarioSimulationService {
  private static runId: string | null = null;
  private static scenarioName: string = 'Citywide Accident';
  private static intensity: number = 5;
  private static ambulanceCount: number = 2;
  private static aiAggression: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  private static speedMultiplier: number = 1;
  private static tick: number = 0;
  
  private static ambulances: SimulatedAmbulance[] = [];
  private static events: string[] = [];
  private static recommendations: AIRecommendation[] = [];
  private static activeConflicts: CorridorConflict[] = [];
  private static isRunning: boolean = false;
  private static isPaused: boolean = false;
  private static interval: NodeJS.Timeout | null = null;
  private static socketIo: any = null;

  // New Delhi hardcoded routes for up to 5 ambulances
  private static routesData = [
    {
      name: 'Trauma Unit Alpha',
      priority: 2,
      type: 'Trauma',
      routePoints: [
        [28.6139, 77.2090], // CP Center
        [28.6145, 77.2110], // Signal 1
        [28.6160, 77.2140], // Signal 2
        [28.6190, 77.2180], // Signal 3
        [28.6250, 77.2250]  // Hospital
      ],
      backupPoints: [
        [28.6139, 77.2090],
        [28.6175, 77.2095], // Outer Circle West
        [28.6210, 77.2150], // Janpath North
        [28.6235, 77.2200], // Barakhamba
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Cardiac Unit Beta',
      priority: 1, // Highest priority!
      type: 'Cardiac',
      routePoints: [
        [28.6110, 77.2130], // Ashoka Road South
        [28.6150, 77.2220], // India Gate Circle
        [28.6220, 77.2260], // Tilak Marg
        [28.6250, 77.2250]  // Hospital
      ],
      backupPoints: [
        [28.6110, 77.2130],
        [28.6210, 77.2150], // Janpath North
        [28.6320, 77.2220], // Minto Road
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Pediatric Care Gamma',
      priority: 3,
      type: 'Pediatric',
      routePoints: [
        [28.6250, 77.1950], // Mandir Marg
        [28.6300, 77.2050], // Panchkuian Road
        [28.6320, 77.2220], // Minto Road
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6250, 77.1950],
        [28.6139, 77.2090], // CP Center
        [28.6210, 77.2150], // Janpath North
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Standard Transport Delta',
      priority: 4,
      type: 'Standard',
      routePoints: [
        [28.6170, 77.2080], // Parliament Street
        [28.6210, 77.2150], // Janpath North
        [28.6220, 77.2260], // Tilak Marg
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6170, 77.2080],
        [28.6139, 77.2090], // CP Center
        [28.6235, 77.2200], // Barakhamba
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Neonatal Unit Epsilon',
      priority: 3,
      type: 'Neonatal',
      routePoints: [
        [28.5980, 77.1850], // Chanakyapuri
        [28.6110, 77.2130], // Ashoka Road
        [28.6129, 77.2295], // India Gate Circle
        [28.6150, 77.2400], // Pragati Maidan
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.5980, 77.1850],
        [28.6250, 77.1950], // Mandir Marg
        [28.6139, 77.2090], // CP Center
        [28.6250, 77.2250]
      ]
    }
  ];

  private static trafficSignals = [
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1', status: 'NORMAL' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2', status: 'NORMAL' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3', status: 'NORMAL' }
  ];

  static async initializeSimulation(
    scenarioName: string,
    intensity: number,
    ambulanceCount: number,
    aiAggression: 'LOW' | 'MEDIUM' | 'HIGH',
    speedMultiplier: number,
    io: any
  ) {
    if (this.isRunning) {
      this.stopSimulation();
    }

    this.scenarioName = scenarioName;
    this.intensity = intensity;
    this.ambulanceCount = Math.min(5, Math.max(1, ambulanceCount));
    this.aiAggression = aiAggression;
    this.speedMultiplier = speedMultiplier;
    this.socketIo = io;
    this.tick = 0;
    this.events = [];
    this.recommendations = [];
    this.activeConflicts = [];
    this.isPaused = false;

    // Reset grid
    CongestionPropagationEngine.reset();
    this.trafficSignals.forEach(s => s.status = 'NORMAL');

    // Spawn ambulances
    this.ambulances = [];
    for (let i = 0; i < this.ambulanceCount; i++) {
      const data = this.routesData[i];
      this.ambulances.push({
        id: `amb-${i + 1}`,
        name: data.name,
        priority: data.priority,
        type: data.type,
        currentLat: data.routePoints[0][0],
        currentLng: data.routePoints[0][1],
        routePoints: data.routePoints as [number, number][],
        backupPoints: data.backupPoints as [number, number][],
        routeIndex: 0,
        usingBackup: false,
        status: 'EN_ROUTE',
        etaMins: Math.round(data.routePoints.length * 1.8),
        speed: 60,
        delayAccumulatedSec: 0,
        stabilityScore: 95
      });
    }

    // Save to Database
    const run = await prisma.simulationRun.create({
      data: {
        scenarioName: this.scenarioName,
        intensity: this.intensity,
        ambulanceCount: this.ambulanceCount,
        aiAggression: this.aiAggression,
        speed: this.speedMultiplier,
        status: 'RUNNING'
      }
    });

    this.runId = run.id;

    // Seed Driver users if they don't exist to associate sessions
    let driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          name: 'Simulated Dispatcher',
          email: 'simulated@ambulink.org',
          passwordHash: '$2b$10$xyz',
          role: 'DRIVER'
        }
      });
    }

    // Create Emergency Session inside DB for each simulated ambulance
    for (const amb of this.ambulances) {
      const path = amb.routePoints;
      await prisma.emergencySession.create({
        data: {
          id: `sim-sess-${run.id}-${amb.id}`,
          driverId: driverUser.id,
          simulationRunId: run.id,
          status: 'ACTIVE',
          severity: 5 - amb.priority,
          startLat: path[0][0],
          startLng: path[0][1],
          endLat: path[path.length - 1][0],
          endLng: path[path.length - 1][1],
          currentLat: path[0][0],
          currentLng: path[0][1],
          routePolyline: '',
          routePoints: JSON.stringify(path),
          emergencyMode: amb.usingBackup ? 'ADAPTIVE_AI' : 'STANDARD',
          corridorRadius: 1200
        }
      });
    }

    this.isRunning = true;
    this.logEvent(`Simulation Run initiated. Scenario: "${this.scenarioName}" | Intensity: ${this.intensity}/10 | Speed: ${this.speedMultiplier}x`);
    this.startInterval();
  }

  static getActiveRunId(): string | null {
    return this.runId;
  }

  static logEvent(message: string) {
    console.log(`[Simulator] ${message}`);
    this.events.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  static startInterval() {
    if (this.interval) clearInterval(this.interval);

    // Baseline interval is 1500ms, divided by speed multiplier (1x, 2x, 5x)
    const delay = Math.round(1500 / this.speedMultiplier);

    this.interval = setInterval(async () => {
      if (this.isPaused) return;
      try {
        await this.runTick();
      } catch (err) {
        console.error('Error running simulation tick:', err);
      }
    }, delay);
  }

  static pauseSimulation() {
    this.isPaused = true;
    this.logEvent('Simulation paused by control center.');
    if (this.socketIo) this.socketIo.emit('simulation_paused');
  }

  static resumeSimulation() {
    this.isPaused = false;
    this.logEvent('Simulation resumed.');
    if (this.socketIo) this.socketIo.emit('simulation_resumed');
  }

  static stopSimulation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    this.runId = null;
  }

  static adjustIntensity(val: number) {
    this.intensity = val;
    this.logEvent(`Environmental hazard intensity adjusted to ${val}/10.`);
  }

  static adjustSpeed(val: number) {
    this.speedMultiplier = val;
    this.logEvent(`Simulation tick speed adjusted to ${val}x.`);
    if (this.isRunning && !this.isPaused) {
      this.startInterval(); // refresh interval delay
    }
  }

  static deployPoliceToSector(sectorId: string) {
    CongestionPropagationEngine.deployPolice(sectorId);
    const s = CongestionPropagationEngine.getSector(sectorId);
    this.logEvent(`Police Command: Tactical clearance units deployed to ${s?.name || 'Sector ' + sectorId}.`);
    
    // Save to Database intervention log
    if (this.runId) {
      this.ambulances.forEach(async (amb) => {
        if (amb.status === 'EN_ROUTE') {
          try {
            await prisma.policeIntervention.create({
              data: {
                sessionId: `sim-sess-${this.runId}-${amb.id}`,
                actionType: 'FORCE_PREEMPTION',
                details: `Police deployed to Sector ${sectorId} (${s?.name})`
              }
            });
          } catch (e) {}
        }
      });
    }
  }

  static async runTick() {
    this.tick++;

    // 1. Tick Congestion propagation
    CongestionPropagationEngine.runPropagationTick(this.scenarioName, this.intensity, this.tick);
    const sectors = CongestionPropagationEngine.getSectors();

    // 2. Scenario-specific event feeds
    this.checkScenarioSpecificEvents();

    // 3. Move Ambulances & update stability/ETA
    let allArrived = true;
    this.ambulances.forEach((amb) => {
      if (amb.status === 'ARRIVED') return;
      allArrived = false;

      const path = amb.usingBackup ? amb.backupPoints : amb.routePoints;
      
      // Advance route index
      amb.routeIndex++;
      if (amb.routeIndex >= path.length) {
        amb.status = 'ARRIVED';
        amb.routeIndex = path.length - 1;
        amb.currentLat = path[path.length - 1][0];
        amb.currentLng = path[path.length - 1][1];
        amb.speed = 0;
        amb.etaMins = 0;
        this.logEvent(`✅ ${amb.name} successfully arrived at City General Hospital. Corridor cleared.`);
        
        // Update DB session
        if (this.runId) {
          prisma.emergencySession.update({
            where: { id: `sim-sess-${this.runId}-${amb.id}` },
            data: { status: 'COMPLETED', endTime: new Date() }
          }).catch(e => {});
        }
        return;
      }

      // Update location coords
      amb.currentLat = path[amb.routeIndex][0];
      amb.currentLng = path[amb.routeIndex][1];

      // Get sector ambulance is currently in
      const currentSector = this.findNearestSector(amb.currentLat, amb.currentLng, sectors);
      const density = currentSector ? currentSector.density : 20;

      // Mathematical models for speed & stability
      let baseSpeed = amb.usingBackup ? 70 : 50; // Backup paths are alternate expressways
      const signalPreempted = this.trafficSignals.some(s => {
        const dist = this.getDistance(amb.currentLat, amb.currentLng, s.lat, s.lng);
        return dist < 0.25 && s.status === 'GREEN_HELD';
      });

      if (signalPreempted) baseSpeed += 15; // Speed boost through green held signal

      // Speed decreases with density and blockages
      const obstructionPenalty = currentSector?.blocked ? 40 : 0;
      amb.speed = Math.max(10, baseSpeed - (density * 0.4) - obstructionPenalty);

      // Stability deteriorates with congestion and speed drops
      let stability = 100 - (density * 0.4) - (obstructionPenalty * 1.2);
      if (signalPreempted) stability += 10;
      amb.stabilityScore = Math.round(Math.min(Math.max(stability, 10), 100));

      // Delay accumulator (free-flow standard is 60km/h)
      if (amb.speed < 45) {
        const tickDelay = Math.round((45 - amb.speed) * 0.8);
        amb.delayAccumulatedSec += tickDelay;
      }

      // Update ETA
      const remainingPoints = path.length - amb.routeIndex;
      amb.etaMins = Math.round(remainingPoints * 1.5 * (60 / amb.speed));

      // Sync to database
      if (this.runId) {
        prisma.emergencySession.update({
          where: { id: `sim-sess-${this.runId}-${amb.id}` },
          data: {
            currentLat: amb.currentLat,
            currentLng: amb.currentLng,
            routeStability: amb.stabilityScore,
            congestionRisk: currentSector?.riskLevel || 'LOW'
          }
        }).catch(e => {});
      }
    });

    // 4. AI Engine: Analyze stability and route risks
    const aiAnalysis = EmergencyAIController.analyzeSimulationState(this.ambulances, sectors, this.aiAggression);
    this.recommendations = aiAnalysis.recommendations;

    // AI Rerouting Decisions (if Aggression supports auto reroute or route blocked)
    this.ambulances.forEach(async (amb) => {
      if (amb.status !== 'EN_ROUTE') return;
      const failProb = aiAnalysis.failureProbabilities[amb.id] || 0;
      
      const shouldAutoReroute = !amb.usingBackup && (
        (failProb > 75) || // high risk corridor failure
        (this.aiAggression === 'HIGH' && failProb > 55) ||
        (sectors.some(s => s.blocked && this.getDistance(amb.currentLat, amb.currentLng, s.lat, s.lng) < 0.6))
      );

      if (shouldAutoReroute) {
        amb.usingBackup = true;
        amb.routeIndex = 0; // restart indexes along alternative
        // Re-align starting position to nearest point on backup path
        let minIdx = 0;
        let minDist = Infinity;
        amb.backupPoints.forEach((pt, idx) => {
          const dist = this.getDistance(amb.currentLat, amb.currentLng, pt[0], pt[1]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = idx;
          }
        });
        amb.routeIndex = minIdx;
        this.logEvent(`🧠 AI OVERRIDE: ${amb.name} rerouted to Alternate Corridor (Janpath Bypass) to evade high risk zones.`);
        
        // Log reroute event in database
        if (this.runId) {
          try {
            await prisma.rerouteHistory.create({
              data: {
                sessionId: `sim-sess-${this.runId}-${amb.id}`,
                reason: `AI Auto Override. Corridor risk probability ${failProb}%.`,
                oldRoutePoints: JSON.stringify(amb.routePoints),
                newRoutePoints: JSON.stringify(amb.backupPoints),
                oldEta: amb.etaMins + 4,
                newEta: amb.etaMins
              }
            });
            await prisma.emergencySession.update({
              where: { id: `sim-sess-${this.runId}-${amb.id}` },
              data: {
                routePolyline: 'backup',
                emergencyMode: 'ADAPTIVE_AI',
                reroutesCount: 1
              }
            });
          } catch(e) {}
        }
      }
    });

    // 5. Corridor conflict resolution & signal syncing
    const conflicts = CorridorConflictResolver.resolveConflicts(this.ambulances, this.trafficSignals);
    this.activeConflicts = conflicts.conflicts;

    // Apply signal statuses
    this.trafficSignals.forEach(sig => {
      const sync = conflicts.signalSyncList.find(s => s.signalName === sig.name);
      if (sync) {
        sig.status = sync.status;
      } else {
        sig.status = 'NORMAL';
      }
    });

    // Apply conflict resolver reroutes
    conflicts.rerouteAmbulanceIds.forEach(ambId => {
      const amb = this.ambulances.find(a => a.id === ambId);
      if (amb && !amb.usingBackup) {
        amb.usingBackup = true;
        amb.routeIndex = 0;
        this.logEvent(`⚡ Priority Corridor Collision Prevention: ${amb.name} rerouted to avoid conflicting with higher priority vehicle.`);
      }
    });

    // Emit live events if conflict detected
    this.activeConflicts.forEach(conf => {
      if (this.tick % 5 === 0) {
        this.logEvent(`⚠️ Conflict Resolved: ${conf.resolutionText}`);
      }
    });

    // 6. Persist Simulation Snapshot
    const blockages = CongestionPropagationEngine.getObstructionsForSimulation(this.scenarioName, this.tick);
    
    if (this.runId) {
      await prisma.simulationSnapshot.create({
        data: {
          simulationRunId: this.runId,
          tick: this.tick,
          heatmapData: JSON.stringify(sectors.map(s => ({ id: s.id, name: s.name, density: s.density, risk: s.riskLevel, hasPolice: s.hasPolice }))),
          blockages: JSON.stringify(blockages),
          events: JSON.stringify(this.events.slice(0, 15)),
          ambulancePos: JSON.stringify(this.ambulances.map(a => ({ id: a.id, name: a.name, lat: a.currentLat, lng: a.currentLng, status: a.status, speed: Math.round(a.speed), eta: a.etaMins, delay: a.delayAccumulatedSec, priority: a.priority, type: a.type, usingBackup: a.usingBackup, stabilityScore: a.stabilityScore })))
        }
      });
    }

    // 7. Emit updates to websockets
    if (this.socketIo) {
      this.socketIo.emit('simulation_update', {
        runId: this.runId,
        tick: this.tick,
        time: `${Math.round(this.tick * 1.5)}s`,
        sectors: sectors,
        blockages: blockages,
        ambulances: this.ambulances,
        trafficSignals: this.trafficSignals,
        events: this.events,
        recommendations: this.recommendations,
        conflicts: this.activeConflicts,
        intensity: this.intensity,
        speedMultiplier: this.speedMultiplier,
        aiAggression: this.aiAggression
      });
    }

    // 8. End condition: all arrived
    if (allArrived) {
      this.logEvent(`🏆 Mission Accomplished. All ${this.ambulanceCount} emergency units successfully cleared corridors.`);
      this.stopSimulation();

      // Retrieve all snapshots to build analytics report
      if (this.runId) {
        const snapshots = await prisma.simulationSnapshot.findMany({
          where: { simulationRunId: this.runId },
          orderBy: { tick: 'asc' }
        });
        
        const analytics = ResponseAnalyticsService.generateReport(snapshots, this.intensity, this.aiAggression);
        
        // Save analytics to database
        await prisma.simulationRun.update({
          where: { id: this.runId },
          data: {
            status: 'COMPLETED',
            efficiencyScore: analytics.efficiencyScore,
            averageDelay: analytics.averageDelaySec,
            rerouteCount: analytics.rerouteCount,
            stabilityMetric: analytics.averageStability,
            policeEffectiveness: analytics.policeEffectiveness,
            recoveryDuration: analytics.recoveryDurationMin
          }
        });

        if (this.socketIo) {
          this.socketIo.emit('simulation_completed', {
            runId: this.runId,
            analytics
          });
        }
      }
    }
  }

  private static checkScenarioSpecificEvents() {
    if (this.tick === 1) {
      this.logEvent(`⚠️ Scenario Alert: High risk hazard triggered in city grid.`);
    }
    
    if (this.scenarioName === 'Flooded Road Network') {
      if (this.tick === 3) {
        this.logEvent(`🌊 Sector 7 (Pragati Maidan) road network flooded. Lanes closed.`);
      } else if (this.tick === 6) {
        this.logEvent(`🌊 Flood propagation detected near Sector 10 (Minto Road). Subways blocked.`);
      }
    } else if (this.scenarioName === 'VIP Convoy Road Blockage') {
      if (this.tick % 3 === 0) {
        this.logEvent(`🚨 VIP convoy clearing next intersection sector. Police blockades active.`);
      }
    } else if (this.scenarioName === 'Highway Multi-Car Collision') {
      if (this.tick === 2) {
        this.logEvent(`💥 Crash! Multi-car collision on Ashoka expressway corridor. Primary route blocked.`);
      }
    } else if (this.scenarioName === 'Fire Emergency Zone') {
      if (this.tick === 2) {
        this.logEvent(`🔥 Fire spreading near Janpath North sector. Heavy emergency deployment active.`);
      }
    } else if (this.scenarioName === 'Chemical Hazard Route Block') {
      if (this.tick === 1) {
        this.logEvent(`☣️ Chemical tanker spill on Panchkuian Road. HAZMAT containment zone established.`);
      }
    } else if (this.scenarioName === 'Hospital Overflow Crisis') {
      if (this.tick === 3) {
        this.logEvent(`🏥 Trauma center arrivals exceed capacity. Primary ambulance access gate jammed.`);
      }
    }
  }

  private static findNearestSector(lat: number, lng: number, sectors: Sector[]): Sector | null {
    let nearest: Sector | null = null;
    let minDist = Infinity;
    sectors.forEach(s => {
      const dist = this.getDistance(lat, lng, s.lat, s.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    });
    return nearest;
  }

  private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = lat1 - lat2;
    const dLng = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  }
}
