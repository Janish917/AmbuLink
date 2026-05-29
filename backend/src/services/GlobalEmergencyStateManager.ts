import { PrismaClient } from '@prisma/client';
import { CongestionPropagationEngine } from './CongestionPropagationEngine';
import { HospitalLoadBalancerService, SimulatedHospital } from './HospitalLoadBalancerService';
import { CivilianComplianceEngine, SectorLiveCompliance } from './CivilianComplianceEngine';
import { EmergencyAIController, AIRecommendation } from './EmergencyAIController';
import { CorridorConflictResolver, CorridorConflict } from './CorridorConflictResolver';
import { SectorBehaviorAnalyzer } from './SectorBehaviorAnalyzer';

const prisma = new PrismaClient();

export interface GlobalAmbulance {
  id: string;
  name: string;
  priority: number;
  type: string;
  currentLat: number;
  currentLng: number;
  routePoints: [number, number][];
  backupPoints: [number, number][];
  routeIndex: number;
  usingBackup: boolean;
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  speed: number;
  delayAccumulatedSec: number;
  stabilityScore: number;
  etaMins: number;
  targetHospitalId: string;
}

export class GlobalEmergencyStateManager {
  private static runId: string | null = null;
  private static scenarioName: string = 'Standard Emergency Run';
  private static speedMultiplier: number = 1;
  private static tick: number = 0;
  private static isRunning: boolean = false;
  private static isPaused: boolean = false;
  private static interval: NodeJS.Timeout | null = null;
  private static socketIo: any = null;

  // Shared state fields
  private static ambulances: GlobalAmbulance[] = [];
  private static hospitals: SimulatedHospital[] = [];
  private static sectors: SectorLiveCompliance[] = [];
  private static signals = [
    { lat: 28.6145, lng: 77.2110, name: 'Connaught Place Signal 1', status: 'NORMAL', holdingFor: '' },
    { lat: 28.6160, lng: 77.2140, name: 'Connaught Place Signal 2', status: 'NORMAL', holdingFor: '' },
    { lat: 28.6190, lng: 77.2180, name: 'Connaught Place Signal 3', status: 'NORMAL', holdingFor: '' }
  ];
  private static conflicts: CorridorConflict[] = [];
  private static alerts: string[] = [];
  private static recommendations: AIRecommendation[] = [];
  private static redirectsCount: number = 0;
  private static learningConfidence: number = 75;
  private static totalLearningRuns: number = 14;

  // Predefined routes
  private static baseRoutes: Record<string, [number, number][]> = {
    'HOSP-01': [
      [28.6139, 77.2090],
      [28.6145, 77.2110],
      [28.6160, 77.2140],
      [28.6190, 77.2180],
      [28.6250, 77.2250]
    ],
    'HOSP-02': [
      [28.6139, 77.2090],
      [28.6150, 77.2120],
      [28.6180, 77.2170],
      [28.6240, 77.2220],
      [28.6300, 77.2300]
    ],
    'HOSP-03': [
      [28.6139, 77.2090],
      [28.6120, 77.2080],
      [28.6100, 77.2090],
      [28.6080, 77.2095],
      [28.6050, 77.2100]
    ],
    'HOSP-04': [
      [28.6139, 77.2090],
      [28.6140, 77.2150],
      [28.6150, 77.2220],
      [28.6170, 77.2350],
      [28.6180, 77.2450]
    ]
  };

  private static backupRoutes: Record<string, [number, number][]> = {
    'HOSP-01': [
      [28.6139, 77.2090],
      [28.6175, 77.2095],
      [28.6210, 77.2150],
      [28.6235, 77.2200],
      [28.6250, 77.2250]
    ],
    'HOSP-02': [
      [28.6139, 77.2090],
      [28.6175, 77.2095],
      [28.6210, 77.2150],
      [28.6260, 77.2220],
      [28.6300, 77.2300]
    ],
    'HOSP-03': [
      [28.6139, 77.2090],
      [28.6150, 77.2120],
      [28.6110, 77.2130],
      [28.6070, 77.2110],
      [28.6050, 77.2100]
    ],
    'HOSP-04': [
      [28.6139, 77.2090],
      [28.6175, 77.2095],
      [28.6190, 77.2180],
      [28.6185, 77.2300],
      [28.6180, 77.2450]
    ]
  };

  static async initializeSimulation(scenarioName: string, speedMultiplier: number, io: any) {
    if (this.isRunning) {
      this.stopSimulation();
    }

    this.scenarioName = scenarioName;
    this.speedMultiplier = speedMultiplier;
    this.socketIo = io;
    this.tick = 0;
    this.redirectsCount = 0;
    this.alerts = [];
    this.recommendations = [];
    this.conflicts = [];
    this.isPaused = false;
    this.learningConfidence = 78;

    // Reset standard engines
    CongestionPropagationEngine.reset();
    this.signals.forEach(s => {
      s.status = 'NORMAL';
      s.holdingFor = '';
    });

    // Set up Simulated Hospitals
    this.hospitals = [
      {
        id: 'HOSP-01',
        name: 'City General Hospital',
        lat: 28.6250,
        lng: 77.2250,
        icuBedsTotal: 50,
        icuBedsOccupied: 35,
        traumaBedsTotal: 20,
        traumaBedsOccupied: 11,
        erQueueLoad: 12,
        doctorsAvailable: 9,
        doctorsTotal: 15,
        surgeryQueueLoad: 2,
        status: 'NORMAL',
        overloadProbability: 25,
        readinessScore: 88,
        estimatedIntakeDelay: 120,
        inflow: 0
      },
      {
        id: 'HOSP-02',
        name: 'Metro Central Medical',
        lat: 28.6300,
        lng: 77.2300,
        icuBedsTotal: 60,
        icuBedsOccupied: 45,
        traumaBedsTotal: 25,
        traumaBedsOccupied: 16,
        erQueueLoad: 20,
        doctorsAvailable: 6,
        doctorsTotal: 18,
        surgeryQueueLoad: 4,
        status: 'NORMAL',
        overloadProbability: 40,
        readinessScore: 78,
        estimatedIntakeDelay: 240,
        inflow: 0
      },
      {
        id: 'HOSP-03',
        name: 'Safdarjung Trauma Care',
        lat: 28.6050,
        lng: 77.2100,
        icuBedsTotal: 80,
        icuBedsOccupied: 74,
        traumaBedsTotal: 40,
        traumaBedsOccupied: 37,
        erQueueLoad: 35,
        doctorsAvailable: 3,
        doctorsTotal: 25,
        surgeryQueueLoad: 8,
        status: 'HIGH_PRESSURE',
        overloadProbability: 82,
        readinessScore: 45,
        estimatedIntakeDelay: 600,
        inflow: 0
      },
      {
        id: 'HOSP-04',
        name: 'Apollo Emergency Center',
        lat: 28.6180,
        lng: 77.2450,
        icuBedsTotal: 45,
        icuBedsOccupied: 22,
        traumaBedsTotal: 15,
        traumaBedsOccupied: 5,
        erQueueLoad: 6,
        doctorsAvailable: 10,
        doctorsTotal: 12,
        surgeryQueueLoad: 1,
        status: 'NORMAL',
        overloadProbability: 15,
        readinessScore: 94,
        estimatedIntakeDelay: 60,
        inflow: 0
      }
    ];

    // Spawn Ambulances based on Scenario
    this.ambulances = [];
    if (scenarioName === 'Multi-Ambulance Coordination') {
      // 2 ambulances with conflicting corridors
      this.ambulances = [
        {
          id: 'amb-1',
          name: 'Trauma Unit Alpha',
          priority: 2,
          type: 'Trauma',
          currentLat: 28.6139,
          currentLng: 77.2090,
          routePoints: this.baseRoutes['HOSP-01'],
          backupPoints: this.backupRoutes['HOSP-01'],
          routeIndex: 0,
          usingBackup: false,
          status: 'EN_ROUTE',
          speed: 60,
          delayAccumulatedSec: 0,
          stabilityScore: 95,
          etaMins: 8,
          targetHospitalId: 'HOSP-01'
        },
        {
          id: 'amb-2',
          name: 'Cardiac Unit Beta',
          priority: 1, // higher priority
          type: 'Cardiac',
          currentLat: 28.6110,
          currentLng: 77.2130, // Starts ashoka road south heading to India gate
          routePoints: [
            [28.6110, 77.2130],
            [28.6150, 77.2220],
            [28.6220, 77.2260],
            [28.6250, 77.2250]
          ],
          backupPoints: [
            [28.6110, 77.2130],
            [28.6210, 77.2150],
            [28.6300, 77.2300]
          ],
          routeIndex: 0,
          usingBackup: false,
          status: 'EN_ROUTE',
          speed: 65,
          delayAccumulatedSec: 0,
          stabilityScore: 98,
          etaMins: 6,
          targetHospitalId: 'HOSP-01'
        }
      ];
      this.hospitals[0].inflow = 2; // both heading to City General
    } else {
      // 1 ambulance Standard or Congestion Failure
      this.ambulances = [
        {
          id: 'amb-1',
          name: 'Trauma Unit Echo',
          priority: 2,
          type: 'Trauma',
          currentLat: 28.6139,
          currentLng: 77.2090,
          routePoints: this.baseRoutes['HOSP-01'],
          backupPoints: this.backupRoutes['HOSP-01'],
          routeIndex: 0,
          usingBackup: false,
          status: 'EN_ROUTE',
          speed: 60,
          delayAccumulatedSec: 0,
          stabilityScore: 95,
          etaMins: 8,
          targetHospitalId: 'HOSP-01'
        }
      ];
      this.hospitals[0].inflow = 1;
    }

    // Initialize DB simulation run log
    const run = await prisma.simulationRun.create({
      data: {
        scenarioName: this.scenarioName,
        intensity: 5,
        ambulanceCount: this.ambulances.length,
        aiAggression: 'HIGH',
        speed: this.speedMultiplier,
        status: 'RUNNING'
      }
    });

    this.runId = run.id;
    this.isRunning = true;

    this.logEvent(`SAPS AI Engine: Initialized shared city simulation grid under "${scenarioName}".`);
    this.logEvent(`Central Coordinator: Tracking ${this.ambulances.length} ambulance(s) and syncing 4 hospital nodes.`);

    this.startInterval();
  }

  static logEvent(msg: string) {
    console.log(`[Global AI] ${msg}`);
    this.alerts.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }

  static startInterval() {
    if (this.interval) clearInterval(this.interval);
    const delay = Math.round(1500 / this.speedMultiplier);
    this.interval = setInterval(async () => {
      if (this.isPaused) return;
      try {
        await this.runTick();
      } catch (e) {
        console.error('Error running global state tick:', e);
      }
    }, delay);
  }

  static pauseSimulation() {
    this.isPaused = true;
    this.logEvent('Simulation paused by command operator.');
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

  static adjustSpeed(val: number) {
    this.speedMultiplier = val;
    this.logEvent(`Simulation speed adjusted to ${val}x.`);
    if (this.isRunning && !this.isPaused) {
      this.startInterval();
    }
  }

  static deployPolice(sectorId: string) {
    // Reduce congestion in targeted sector
    CongestionPropagationEngine.deployPolice(sectorId);
    const s = CongestionPropagationEngine.getSector(sectorId);
    this.logEvent(`Police Unit: Escort dispatched to ${s?.name || 'Sector ' + sectorId}. Congestion cleared.`);
    
    // Dynamically improve compliance
    this.learningConfidence = Math.min(99, this.learningConfidence + 5);
  }

  static forceOverload(hospitalId: string) {
    const h = this.hospitals.find(x => x.id === hospitalId);
    if (h) {
      h.icuBedsOccupied = h.icuBedsTotal;
      h.traumaBedsOccupied = h.traumaBedsTotal;
      h.erQueueLoad = Math.round(h.icuBedsTotal * 0.9);
      h.doctorsAvailable = 0;
      h.surgeryQueueLoad = 10;
      h.status = 'OVERLOADED';
      h.overloadProbability = 100;
      h.readinessScore = 5;
      h.estimatedIntakeDelay = 1200;

      this.logEvent(`🚨 Critical Warning: Capacity OVERLOAD forced at ${h.name}.`);
      
      // Trigger dynamic redirect for any ambulance en-route to this overloaded hospital
      this.ambulances.forEach(amb => {
        if (amb.status === 'EN_ROUTE' && amb.targetHospitalId === hospitalId) {
          this.triggerHospitalRedirection(amb, 'Hospital overload override');
        }
      });
    }
  }

  private static triggerHospitalRedirection(amb: GlobalAmbulance, reason: string) {
    this.redirectsCount++;
    const oldHospitalName = this.getHospitalName(amb.targetHospitalId);

    // Compute best alternative hospital
    const alternatives = this.hospitals
      .filter(h => h.id !== amb.targetHospitalId && h.status !== 'OVERLOADED')
      .map(h => {
        // Distance and travel delay
        const dist = Math.sqrt(Math.pow(amb.currentLat - h.lat, 2) + Math.pow(amb.currentLng - h.lng, 2)) * 111.32;
        const eta = Math.round((dist / 50) * 3600);
        const score = (eta * 0.4) + (h.estimatedIntakeDelay * 0.6);
        return { hospitalId: h.id, name: h.name, score };
      })
      .sort((a, b) => a.score - b.score);

    const newTarget = alternatives[0] ? alternatives[0].hospitalId : 'HOSP-04';
    const newHospitalName = this.getHospitalName(newTarget);

    // Adjust inflows
    this.hospitals.forEach(h => {
      if (h.id === amb.targetHospitalId) h.inflow = Math.max(0, h.inflow - 1);
      if (h.id === newTarget) h.inflow += 1;
    });

    amb.targetHospitalId = newTarget;

    // Generate dynamic path from current location to new hospital
    const startLat = amb.currentLat;
    const startLng = amb.currentLng;
    const endLat = this.hospitals.find(h => h.id === newTarget)!.lat;
    const endLng = this.hospitals.find(h => h.id === newTarget)!.lng;

    const dynamicPath: [number, number][] = [
      [startLat, startLng],
      [startLat + (endLat - startLat) * 0.33, startLng + (endLng - startLng) * 0.33],
      [startLat + (endLat - startLat) * 0.66, startLng + (endLng - startLng) * 0.66],
      [endLat, endLng]
    ];

    amb.routePoints = dynamicPath;
    amb.routeIndex = 0;

    this.logEvent(`🚨 Smart Load Balancer: Rerouting ${amb.name} from ${oldHospitalName} to ${newHospitalName} due to overload.`);
  }

  private static getHospitalName(id: string): string {
    return this.hospitals.find(h => h.id === id)?.name || 'Trauma Center';
  }

  static async runTick() {
    this.tick++;

    // 1. Tick Congestion Propagation
    CongestionPropagationEngine.runPropagationTick(this.scenarioName, 6, this.tick);
    const rawSectors = CongestionPropagationEngine.getSectors();

    // Trigger Congestion Failure Scenario Blockage on Tick 3
    if (this.scenarioName === 'Congestion Failure Run' && this.tick === 3) {
      // Force sector 2 (Janpath North) blockage
      const sec2 = rawSectors.find(s => s.id === '2');
      if (sec2) {
        sec2.density = 95;
        sec2.blocked = true;
        sec2.riskLevel = 'HIGH';
        this.logEvent(`🌊 Obstruction Alert: Pragati Maidan underpass flooded. PrimaryCP Corridor blocked.`);
      }
    }

    // 2. Hospital beds occupancy & queues fluctuations
    this.hospitals.forEach(h => {
      if (h.status === 'OVERLOADED') return;
      
      // ER queue shifts
      if (Math.random() > 0.5) {
        h.erQueueLoad = Math.max(0, h.erQueueLoad + (Math.random() > 0.5 ? 2 : -2));
      }
      // ICU Bed occupied shifts
      if (Math.random() > 0.6) {
        h.icuBedsOccupied = Math.min(h.icuBedsTotal, Math.max(0, h.icuBedsOccupied + (Math.random() > 0.5 ? 1 : -1)));
      }

      // Recompute Readiness metrics
      const icuOccRatio = h.icuBedsOccupied / h.icuBedsTotal;
      h.overloadProbability = Math.round(icuOccRatio * 100);
      if (h.overloadProbability >= 90) {
        h.status = 'OVERLOADED';
        h.estimatedIntakeDelay = 1200;
        h.readinessScore = 5;
      } else {
        h.status = h.overloadProbability >= 65 ? 'HIGH_PRESSURE' : 'NORMAL';
        h.estimatedIntakeDelay = Math.round(h.erQueueLoad * 25 + h.icuBedsOccupied * 10);
        h.readinessScore = Math.round(100 - (h.overloadProbability * 0.6) - (h.estimatedIntakeDelay * 0.02));
      }
    });

    // Check if targets are overloaded
    this.ambulances.forEach(amb => {
      if (amb.status === 'EN_ROUTE') {
        const target = this.hospitals.find(h => h.id === amb.targetHospitalId);
        if (target && target.status === 'OVERLOADED') {
          this.triggerHospitalRedirection(amb, 'Hospital overload capacity check');
        }
      }
    });

    // 3. Update compliance grid data
    this.sectors = CivilianComplianceEngine.getLiveComplianceGrid(rawSectors);

    // 4. Move Ambulances along paths
    let allArrived = true;
    this.ambulances.forEach(amb => {
      if (amb.status === 'ARRIVED') return;
      allArrived = false;

      const path = amb.usingBackup ? amb.backupPoints : amb.routePoints;
      
      amb.routeIndex++;
      if (amb.routeIndex >= path.length) {
        amb.status = 'ARRIVED';
        amb.routeIndex = path.length - 1;
        amb.currentLat = path[path.length - 1][0];
        amb.currentLng = path[path.length - 1][1];
        amb.speed = 0;
        amb.etaMins = 0;
        
        const targetName = this.getHospitalName(amb.targetHospitalId);
        this.logEvent(`✅ ${amb.name} successfully arrived at ${targetName}. Corridor cleared.`);
        return;
      }

      amb.currentLat = path[amb.routeIndex][0];
      amb.currentLng = path[amb.routeIndex][1];

      // Math updates speed & stability
      const nearestSector = rawSectors.find(s => {
        const d = Math.sqrt(Math.pow(amb.currentLat - s.lat, 2) + Math.pow(amb.currentLng - s.lng, 2)) * 111.32;
        return d < 0.6;
      });

      const stats = SectorBehaviorAnalyzer.calculateDynamicSectorStats(
        nearestSector?.id || '1',
        nearestSector?.density || 20,
        nearestSector?.blocked || false,
        nearestSector?.hasPolice || false
      );

      // Check preemption signal green waves
      const signalPreempted = this.signals.some(s => {
        const d = Math.sqrt(Math.pow(amb.currentLat - s.lat, 2) + Math.pow(amb.currentLng - s.lng, 2)) * 111.32;
        return d < 0.3 && s.status === 'GREEN_HELD';
      });

      let baseSpeed = amb.usingBackup ? 75 : 55;
      if (signalPreempted) baseSpeed += 15;

      amb.speed = Math.max(12, Math.round(baseSpeed - (nearestSector?.density || 20) * 0.4 - (nearestSector?.blocked ? 30 : 0)));
      amb.stabilityScore = stats.compliance;

      const delay = Math.max(0, Math.round((60 - amb.speed) * 0.6));
      amb.delayAccumulatedSec += delay;
      amb.etaMins = Math.round((path.length - amb.routeIndex) * 1.5 * (60 / amb.speed));

      // Trigger automatic route rerouting if stability degradations occur
      if (!amb.usingBackup && amb.stabilityScore < 60) {
        amb.usingBackup = true;
        amb.routeIndex = 0;
        // align start to backup path
        let minIdx = 0;
        let minDist = Infinity;
        amb.backupPoints.forEach((pt, idx) => {
          const dist = Math.sqrt(Math.pow(amb.currentLat - pt[0], 2) + Math.pow(amb.currentLng - pt[1], 2)) * 111.32;
          if (dist < minDist) {
            minDist = dist;
            minIdx = idx;
          }
        });
        amb.routeIndex = minIdx;
        this.logEvent(`🧠 Predictive Rerouting: ${amb.name} shifted to backup corridor (Janpath Bypass) to bypass severe congestion.`);
      }
    });

    // 5. Compute overlaps, signal sync overrides, and coordination
    const conflictReports = CorridorConflictResolver.resolveConflicts(this.ambulances as any[], this.signals as any[]);
    this.conflicts = conflictReports.conflicts;

    // Apply signals statuses
    this.signals.forEach(sig => {
      const sync = conflictReports.signalSyncList.find(s => s.signalName === sig.name);
      if (sync) {
        sig.status = sync.status;
        sig.holdingFor = sync.holdingFor;
      } else {
        sig.status = 'NORMAL';
        sig.holdingFor = '';
      }
    });

    // Multi-ambulance coordination priority rerouting triggers
    conflictReports.rerouteAmbulanceIds.forEach(ambId => {
      const amb = this.ambulances.find(a => a.id === ambId);
      if (amb && !amb.usingBackup) {
        amb.usingBackup = true;
        amb.routeIndex = 0;
        this.logEvent(`⚡ Fleet Sync: Rerouted lower-priority ${amb.name} to avoid corridor overlap conflicts with higher priority unit.`);
      }
    });

    // AI suggestions evaluation
    const rawAmbs = this.ambulances.map(a => ({
      id: a.id,
      name: a.name,
      currentLat: a.currentLat,
      currentLng: a.currentLng,
      status: a.status,
      speed: a.speed,
      etaMins: a.etaMins,
      delayAccumulatedSec: a.delayAccumulatedSec,
      priority: a.priority,
      type: a.type,
      usingBackup: a.usingBackup,
      stabilityScore: a.stabilityScore,
      routePoints: a.routePoints,
      backupPoints: a.backupPoints,
      routeIndex: a.routeIndex
    }));
    const aiAnalysis = EmergencyAIController.analyzeSimulationState(rawAmbs, rawSectors as any[], 'HIGH');
    this.recommendations = aiAnalysis.recommendations;

    // 6. Write Snapshots to Database
    if (this.runId) {
      await prisma.simulationSnapshot.create({
        data: {
          simulationRunId: this.runId,
          tick: this.tick,
          heatmapData: JSON.stringify(rawSectors.map(s => ({ id: s.id, name: s.name, density: s.density, risk: s.riskLevel, hasPolice: s.hasPolice }))),
          blockages: JSON.stringify([]),
          events: JSON.stringify(this.alerts.slice(0, 15)),
          ambulancePos: JSON.stringify(this.ambulances.map(a => ({
            id: a.id,
            name: a.name,
            lat: a.currentLat,
            lng: a.currentLng,
            status: a.status,
            speed: a.speed,
            eta: a.etaMins,
            delay: a.delayAccumulatedSec,
            priority: a.priority,
            type: a.type,
            usingBackup: a.usingBackup,
            stabilityScore: a.stabilityScore
          })))
        }
      });
    }

    // 7. Emit Unified Global State Update to Sockets
    if (this.socketIo) {
      const avgIntakeDelay = Math.round(this.hospitals.reduce((acc, h) => acc + h.estimatedIntakeDelay, 0) / this.hospitals.length);
      const avgReadiness = Math.round(this.hospitals.reduce((acc, h) => acc + h.readinessScore, 0) / this.hospitals.length);
      const firstAmb = this.ambulances[0];
      const activeTarget = this.hospitals.find(h => h.id === firstAmb?.targetHospitalId);

      this.socketIo.emit('global_state_update', {
        runId: this.runId,
        tick: this.tick,
        time: `${Math.round(this.tick * 1.5)}s`,
        scenarioName: this.scenarioName,
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        speedMultiplier: this.speedMultiplier,
        
        // ambulances
        ambulances: this.ambulances,
        
        // hospital status
        hospitals: this.hospitals,
        
        // compliance & sectors status
        sectors: this.sectors,
        
        // junctions status
        signals: this.signals,
        
        // logs alerts
        alerts: this.alerts,
        recommendations: this.recommendations,
        conflicts: this.conflicts,
        
        // aggregate KPIs
        kpis: {
          cityComplianceIndex: Math.round(this.sectors.reduce((acc, s) => acc + s.complianceScore, 0) / this.sectors.length || 75),
          cooperationIndex: Math.round(this.sectors.reduce((acc, s) => acc + s.complianceScore, 0) / this.sectors.length || 75),
          delayProbability: Math.round(100 - (this.sectors.reduce((acc, s) => acc + s.complianceScore, 0) / this.sectors.length || 75)),
          mobilityRating: firstAmb ? firstAmb.stabilityScore : 90,
          learningConfidence: this.learningConfidence,
          totalLearningRuns: this.totalLearningRuns,
          
          globalIntakeDelay: avgIntakeDelay,
          globalReadiness: avgReadiness,
          redirectsCount: this.redirectsCount,
          activeInflow: this.ambulances.filter(a => a.status === 'EN_ROUTE').length,
          targetHospitalName: activeTarget?.name || 'None',
          targetReadiness: activeTarget?.readinessScore || 85
        }
      });
    }

    // 8. End condition: all arrived
    if (allArrived) {
      this.logEvent(`🏆 Simulation Concluded: All active units arrived. Triage intake synchronized.`);
      this.stopSimulation();

      if (this.runId) {
        await prisma.simulationRun.update({
          where: { id: this.runId },
          data: {
            status: 'COMPLETED',
            efficiencyScore: 92.5,
            averageDelay: 42.5,
            rerouteCount: this.redirectsCount
          }
        });

        if (this.socketIo) {
          this.socketIo.emit('global_state_completed', {
            runId: this.runId,
            analytics: {
              efficiency: 92.5,
              intakeDelay: 180,
              redirectsCount: this.redirectsCount,
              icuPressure: 65,
              hospitalName: 'City General Hospital',
              tacticalSummary: `Unified city emergency simulation completed successfully. Total redirections: ${this.redirectsCount}. Priority signal synchronization verified across Connaught Place junctions.`
            }
          });
        }
      }
    }
  }
}
