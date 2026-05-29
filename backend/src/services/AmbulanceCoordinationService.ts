import { PrismaClient } from '@prisma/client';
import { CongestionPropagationEngine } from './CongestionPropagationEngine';
import { FleetVehicle, ConflictResolutionEngine, CollisionConflict } from './ConflictResolutionEngine';
import { SignalSynchronizationEngine, SignalOverride } from './SignalSynchronizationEngine';
import { EmergencyPriorityManager } from './EmergencyPriorityManager';
import { FleetAnalyticsService } from './FleetAnalyticsService';

const prisma = new PrismaClient();

export class AmbulanceCoordinationService {
  private static runId: string | null = null;
  private static ambulanceCount: number = 3;
  private static speedMultiplier: number = 1;
  private static tick: number = 0;
  
  private static vehicles: FleetVehicle[] = [];
  private static activeConflicts: CollisionConflict[] = [];
  private static signalOverrides: SignalOverride[] = [];
  private static logs: Array<{ logType: string, message: string }> = [];
  private static isRunning: boolean = false;
  private static isPaused: boolean = false;
  private static interval: NodeJS.Timeout | null = null;
  private static socketIo: any = null;

  // New Delhi grid routes for 6 priority tiers
  private static fleetRoutes = [
    {
      name: 'Rescue Unit Cardiac',
      type: 'Cardiac Arrest',
      routePoints: [
        [28.6139, 77.2090], // CP Center
        [28.6145, 77.2110], // Signal 1
        [28.6160, 77.2140], // Signal 2
        [28.6190, 77.2180], // Signal 3
        [28.6250, 77.2250]  // Hospital
      ],
      backupPoints: [
        [28.6139, 77.2090],
        [28.6175, 77.2095],
        [28.6210, 77.2150],
        [28.6235, 77.2200],
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Trauma Interceptor Alpha',
      type: 'Severe Trauma',
      routePoints: [
        [28.6110, 77.2130], // Ashoka Road South
        [28.6150, 77.2220], // India Gate Circle
        [28.6220, 77.2260], // Tilak Marg
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6110, 77.2130],
        [28.6210, 77.2150],
        [28.6320, 77.2220],
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Stroke Care Bravo',
      type: 'Stroke Emergency',
      routePoints: [
        [28.6250, 77.1950], // Mandir Marg
        [28.6300, 77.2050], // Panchkuian Road
        [28.6320, 77.2220], // Minto Road
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6250, 77.1950],
        [28.6139, 77.2090],
        [28.6210, 77.2150],
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'ICU Critical Gamma',
      type: 'ICU Transfer',
      routePoints: [
        [28.6170, 77.2080], // Parliament Street
        [28.6210, 77.2150], // Janpath North
        [28.6220, 77.2260], // Tilak Marg
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6170, 77.2080],
        [28.6139, 77.2090],
        [28.6235, 77.2200],
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Highway Rescue Delta',
      type: 'Highway Collision',
      routePoints: [
        [28.5980, 77.1850], // Chanakyapuri
        [28.6110, 77.2130], // Ashoka Road
        [28.6129, 77.2295], // India Gate Circle
        [28.6150, 77.2400], // Pragati Maidan
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.5980, 77.1850],
        [28.6250, 77.1950],
        [28.6139, 77.2090],
        [28.6250, 77.2250]
      ]
    },
    {
      name: 'Basic Transfer Epsilon',
      type: 'Non-Critical Transport',
      routePoints: [
        [28.6300, 77.2050], // Panchkuian Road
        [28.6139, 77.2090], // CP Center
        [28.6160, 77.2140], // CP Signal 2
        [28.6190, 77.2180], // CP Signal 3
        [28.6250, 77.2250]
      ],
      backupPoints: [
        [28.6300, 77.2050],
        [28.6320, 77.2220], // Minto Road
        [28.6235, 77.2200], // Barakhamba
        [28.6250, 77.2250]
      ]
    }
  ];

  private static trafficSignals = [
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3' }
  ];

  static async initializeFleet(
    ambulanceCount: number,
    speedMultiplier: number,
    io: any
  ) {
    if (this.isRunning) {
      this.stopFleet();
    }

    this.ambulanceCount = Math.min(6, Math.max(2, ambulanceCount));
    this.speedMultiplier = speedMultiplier;
    this.socketIo = io;
    this.tick = 0;
    this.logs = [];
    this.activeConflicts = [];
    this.signalOverrides = [];
    this.isPaused = false;

    // Reset sectors
    CongestionPropagationEngine.reset();

    // Spawn vehicles
    this.vehicles = [];
    for (let i = 0; i < this.ambulanceCount; i++) {
      const data = this.fleetRoutes[i];
      const priorityConfig = EmergencyPriorityManager.getPriorityConfig(data.type);
      
      this.vehicles.push({
        id: `fleet-amb-${i + 1}`,
        name: data.name,
        emergencyType: data.type,
        currentLat: data.routePoints[0][0],
        currentLng: data.routePoints[0][1],
        routePoints: data.routePoints as [number, number][],
        backupPoints: data.backupPoints as [number, number][],
        routeIndex: 0,
        usingBackup: false,
        status: 'EN_ROUTE',
        etaMins: data.routePoints.length * 2,
        speed: priorityConfig.baseSpeed
      });
    }

    // Save FleetCoordinationRun inside DB
    const run = await prisma.fleetCoordinationRun.create({
      data: {
        status: 'ACTIVE',
        ambulanceCount: this.ambulanceCount,
        corridorUtilization: 20.0,
        conflictCount: 0,
        signalOverridesCount: 0,
        averageDelay: 0.0,
        efficiencyScore: 100.0
      }
    });

    this.runId = run.id;

    // Seed driver and create sessions associated with this fleet run
    let driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          name: 'Central Dispatcher',
          email: 'fleet@ambulink.org',
          passwordHash: '$2b$10$xyz',
          role: 'DRIVER'
        }
      });
    }

    for (const v of this.vehicles) {
      await prisma.emergencySession.create({
        data: {
          id: `fleet-sess-${run.id}-${v.id}`,
          driverId: driverUser.id,
          fleetRunId: run.id,
          status: 'ACTIVE',
          severity: 7 - EmergencyPriorityManager.getPriorityConfig(v.emergencyType).rank,
          startLat: v.routePoints[0][0],
          startLng: v.routePoints[0][1],
          endLat: v.routePoints[v.routePoints.length - 1][0],
          endLng: v.routePoints[v.routePoints.length - 1][1],
          currentLat: v.routePoints[0][0],
          currentLng: v.routePoints[0][1],
          routePoints: JSON.stringify(v.routePoints),
          emergencyMode: 'ADAPTIVE_AI',
          corridorRadius: 1000
        }
      });
    }

    this.isRunning = true;
    await this.logEvent('ACTIVE', `Emergency Central Command initiated: Orchestrating ${this.ambulanceCount} priority vehicles.`);
    this.startInterval();
  }

  static async logEvent(type: string, message: string) {
    console.log(`[Fleet Coordinator] [${type}] ${message}`);
    this.logs.unshift({ logType: type, message });

    if (this.runId) {
      try {
        await prisma.fleetCoordinationLog.create({
          data: {
            runId: this.runId,
            tick: this.tick,
            logType: type,
            message
          }
        });
      } catch (e) {}
    }
  }

  static startInterval() {
    if (this.interval) clearInterval(this.interval);
    const delay = Math.round(1500 / this.speedMultiplier);
    this.interval = setInterval(async () => {
      if (this.isPaused) return;
      try {
        await this.runTick();
      } catch (err) {
        console.error('Error running fleet coordination tick:', err);
      }
    }, delay);
  }

  static pauseFleet() {
    this.isPaused = true;
    if (this.socketIo) this.socketIo.emit('fleet_paused');
  }

  static resumeFleet() {
    this.isPaused = false;
    if (this.socketIo) this.socketIo.emit('fleet_resumed');
  }

  static stopFleet() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    this.runId = null;
  }

  static adjustSpeed(val: number) {
    this.speedMultiplier = val;
    if (this.isRunning && !this.isPaused) {
      this.startInterval();
    }
  }

  static deployPoliceToSector(sectorId: string) {
    CongestionPropagationEngine.deployPolice(sectorId);
    this.logEvent('STABILIZED', `Tactical police units deployed to Sector ${sectorId} to secure overlapping lanes.`);
  }

  static async runTick() {
    this.tick++;

    // 1. Run standard smart-city traffic updates (Flooded scenario base creates some grid locks)
    CongestionPropagationEngine.runPropagationTick('Multi-Ambulance Emergency', 5, this.tick);
    const sectors = CongestionPropagationEngine.getSectors();

    // 2. Advance vehicles
    let allArrived = true;
    let totalDelay = 0;
    let reroutedCount = 0;

    this.vehicles.forEach(v => {
      if (v.status === 'ARRIVED') return;
      allArrived = false;

      const path = v.usingBackup ? v.backupPoints : v.routePoints;
      v.routeIndex++;

      if (v.routeIndex >= path.length) {
        v.status = 'ARRIVED';
        v.routeIndex = path.length - 1;
        v.currentLat = path[path.length - 1][0];
        v.currentLng = path[path.length - 1][1];
        v.speed = 0;
        v.etaMins = 0;
        this.logEvent('STABILIZED', `✅ ${v.name} (${v.emergencyType}) arrived at hospital destination. Corridor cleared.`);
        
        if (this.runId) {
          prisma.emergencySession.update({
            where: { id: `fleet-sess-${this.runId}-${v.id}` },
            data: { status: 'COMPLETED', endTime: new Date() }
          }).catch(e => {});
        }
        return;
      }

      v.currentLat = path[v.routeIndex][0];
      v.currentLng = path[v.routeIndex][1];

      // Proximity details
      const nearestSector = sectors.find(s => {
        const d = Math.sqrt(Math.pow(v.currentLat - s.lat, 2) + Math.pow(v.currentLng - s.lng, 2)) * 111.32;
        return d < 0.6;
      });

      const density = nearestSector ? nearestSector.density : 20;
      const config = EmergencyPriorityManager.getPriorityConfig(v.emergencyType);

      // Math updates speed & delays
      let activeSpeed = config.baseSpeed - (density * 0.35);
      const isSyncGreen = this.signalOverrides.some(s => s.signalName === 'Connaught Place Signal 1' && s.status === 'GREEN_HELD' && s.holdingFor === v.name);
      if (isSyncGreen) activeSpeed += 12;

      v.speed = Math.max(12, Math.round(activeSpeed));
      
      const delayAmount = Math.max(0, Math.round((config.baseSpeed - v.speed) * 0.5));
      totalDelay += delayAmount;

      const remainingPoints = path.length - v.routeIndex;
      v.etaMins = Math.round(remainingPoints * 1.5 * (60 / v.speed));

      if (v.usingBackup) reroutedCount++;
    });

    // 3. Coordinate Overlaps & Corridor Conflicts
    const overlaps = ConflictResolutionEngine.checkCorridorOverlaps(this.vehicles, this.trafficSignals);
    this.activeConflicts = overlaps.conflicts;

    // Log new conflicts in timeline database logs
    this.activeConflicts.forEach(conf => {
      if (this.tick % 4 === 0) {
        this.logEvent('CONFLICT_DETECTED', `Intersection Conflict: ${conf.vehicleA} vs ${conf.vehicleB} near ${conf.conflictLocation}. resolving...`);
        this.logEvent('REROUTE_ASSIGNED', conf.actionTaken);
      }
    });

    // Reroute lower rank vehicles
    overlaps.forceRerouteIds.forEach(vId => {
      const v = this.vehicles.find(a => a.id === vId);
      if (v && !v.usingBackup) {
        v.usingBackup = true;
        v.routeIndex = 0;
      }
    });

    // 4. Signal Synchronization Engine
    this.signalOverrides = SignalSynchronizationEngine.synchronizeSignals(this.vehicles, this.trafficSignals);
    this.signalOverrides.forEach(sig => {
      if (sig.status === 'GREEN_HELD' && this.tick % 5 === 0) {
        this.logEvent('SIGNAL_PREEMPTED', `Preemption overridden: Holding Green Wave at ${sig.signalName} for ${sig.holdingFor}.`);
      }
    });

    // 5. Live Fleet KPIs calculations
    const liveKpis = FleetAnalyticsService.calculateLiveMetrics(this.vehicles, this.activeConflicts, this.signalOverrides);

    // 6. Broadcast live telemetries
    if (this.socketIo) {
      this.socketIo.emit('fleet_update', {
        runId: this.runId,
        tick: this.tick,
        time: `${Math.round(this.tick * 1.5)}s`,
        vehicles: this.vehicles,
        conflicts: this.activeConflicts,
        signals: this.signalOverrides,
        logs: this.logs.slice(0, 15),
        kpis: {
          activeCount: this.vehicles.filter(v => v.status === 'EN_ROUTE').length,
          utilization: liveKpis.utilization,
          conflictProbability: liveKpis.conflictProbability,
          signalOverridesCount: liveKpis.signalOverridesCount,
          averageDelay: Math.round(totalDelay / (this.vehicles.filter(v => v.status === 'EN_ROUTE').length || 1)),
          reroutesCount: reroutedCount
        },
        sectors: sectors
      });
    }

    // 7. End Coordination conditions
    if (allArrived) {
      this.logEvent('STABILIZED', `🏆 Mission Accomplished. All ${this.ambulanceCount} coordinated units successfully completed corridors.`);
      this.stopFleet();

      if (this.runId) {
        const runLogs = await prisma.fleetCoordinationLog.findMany({
          where: { runId: this.runId }
        });

        const report = FleetAnalyticsService.generateReport(
          runLogs,
          this.ambulanceCount,
          Math.round(totalDelay),
          reroutedCount,
          liveKpis.utilization
        );

        // Update DB run stats
        await prisma.fleetCoordinationRun.update({
          where: { id: this.runId },
          data: {
            status: 'COMPLETED',
            corridorUtilization: report.corridorUtilization,
            conflictCount: runLogs.filter(l => l.logType === 'CONFLICT_DETECTED').length,
            signalOverridesCount: report.signalOverridesCount,
            averageDelay: report.averageDelaySec,
            efficiencyScore: report.efficiencyScore
          }
        });

        if (this.socketIo) {
          this.socketIo.emit('fleet_completed', {
            runId: this.runId,
            analytics: report
          });
        }
      }
    }
  }
}
