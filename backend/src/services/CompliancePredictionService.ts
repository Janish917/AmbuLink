import { PrismaClient } from '@prisma/client';
import { CongestionPropagationEngine } from './CongestionPropagationEngine';
import { CivilianComplianceEngine, SectorLiveCompliance } from './CivilianComplianceEngine';
import { EmergencyMobilityAI } from './EmergencyMobilityAI';
import { PoliceRecommendationEngine, ComplianceRecommendation } from './PoliceRecommendationEngine';
import { SectorBehaviorAnalyzer } from './SectorBehaviorAnalyzer';

const prisma = new PrismaClient();

export class CompliancePredictionService {
  private static runId: string | null = null;
  private static speedMultiplier: number = 1;
  private static tick: number = 0;
  
  private static vehicles: any[] = [];
  private static sectorsCompliance: SectorLiveCompliance[] = [];
  private static recommendations: ComplianceRecommendation[] = [];
  private static alerts: string[] = [];
  private static isRunning: boolean = false;
  private static isPaused: boolean = false;
  private static interval: NodeJS.Timeout | null = null;
  private static socketIo: any = null;
  
  // Single main tracking vehicle for simplicity
  private static trackingRoute = [
    [28.6139, 77.2090], // CP Center
    [28.6145, 77.2110], // CP Signal 1
    [28.6160, 77.2140], // CP Signal 2
    [28.6190, 77.2180], // CP Signal 3
    [28.6250, 77.2250]  // Hospital
  ];

  static async initializeRun(
    speedMultiplier: number,
    io: any
  ) {
    if (this.isRunning) {
      this.stopRun();
    }

    this.speedMultiplier = speedMultiplier;
    this.socketIo = io;
    this.tick = 0;
    this.alerts = [];
    this.recommendations = [];
    this.isPaused = false;

    // Reset standard sectors
    CongestionPropagationEngine.reset();
    
    // Set up tracking vehicle
    this.vehicles = [{
      id: 'compliance-amb-1',
      name: 'Trauma Unit Alpha',
      currentLat: this.trackingRoute[0][0],
      currentLng: this.trackingRoute[0][1],
      routeIndex: 0,
      status: 'EN_ROUTE',
      speed: 60,
      delaySec: 0
    }];

    // Save ComplianceRun in DB
    const run = await prisma.complianceRun.create({
      data: {
        status: 'ACTIVE',
        cityComplianceIndex: 75.0,
        cooperationIndex: 75.0,
        delayProbability: 15.0,
        mobilityRating: 90.0
      }
    });

    this.runId = run.id;
    this.isRunning = true;

    this.logAlert('AI core: Initializing Civilian Compliance behaviors models.');
    this.logAlert(`Central Command: Running predictions grid under ${this.speedMultiplier}x speed constraints.`);
    this.startInterval();
  }

  static logAlert(msg: string) {
    console.log(`[Compliance AI] ${msg}`);
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
        console.error('Error running compliance tick:', e);
      }
    }, delay);
  }

  static pauseRun() {
    this.isPaused = true;
    this.logAlert('Compliance simulation paused.');
    if (this.socketIo) this.socketIo.emit('compliance_paused');
  }

  static resumeRun() {
    this.isPaused = false;
    this.logAlert('Compliance simulation resumed.');
    if (this.socketIo) this.socketIo.emit('compliance_resumed');
  }

  static stopRun() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    this.runId = null;
  }

  static adjustSpeed(val: number) {
    this.speedMultiplier = val;
    this.logAlert(`Simulation tick speed updated to ${val}x.`);
    if (this.isRunning && !this.isPaused) {
      this.startInterval();
    }
  }

  static deployPolice(sectorId: string) {
    CongestionPropagationEngine.deployPolice(sectorId);
    const s = CongestionPropagationEngine.getSector(sectorId);
    this.logAlert(`AI Action: Escort dispatched to ${s?.name || 'Sector ' + sectorId}. Compliance index reinforced by +35%.`);
  }

  static async runTick() {
    this.tick++;

    // 1. Tick standard traffic propagation (Flood scenario base causes dynamic grid failures)
    CongestionPropagationEngine.runPropagationTick('Flooded Road Network', 6, this.tick);
    const sectors = CongestionPropagationEngine.getSectors();

    // 2. Advance vehicle
    let allArrived = true;
    let totalDelay = 0;

    this.vehicles.forEach(v => {
      if (v.status === 'ARRIVED') return;
      allArrived = false;

      v.routeIndex++;
      if (v.routeIndex >= this.trackingRoute.length) {
        v.status = 'ARRIVED';
        v.routeIndex = this.trackingRoute.length - 1;
        v.currentLat = this.trackingRoute[v.routeIndex][0];
        v.currentLng = this.trackingRoute[v.routeIndex][1];
        v.speed = 0;
        this.logAlert(`✅ Ambulance arrived. Final mission delay: ${v.delaySec} seconds.`);
        return;
      }

      v.currentLat = this.trackingRoute[v.routeIndex][0];
      v.currentLng = this.trackingRoute[v.routeIndex][1];

      // Math updates speed based on sector compliance
      const nearestSector = sectors.find(s => {
        const d = Math.sqrt(Math.pow(v.currentLat - s.lat, 2) + Math.pow(v.currentLng - s.lng, 2)) * 111.32;
        return d < 0.6;
      });

      const stats = SectorBehaviorAnalyzer.calculateDynamicSectorStats(
        nearestSector?.id || '1',
        nearestSector?.density || 20,
        nearestSector?.blocked || false,
        nearestSector?.hasPolice || false
      );

      // Speed is directly proportional to sector compliance
      v.speed = Math.max(10, Math.round(stats.compliance * 0.8));
      
      const delay = Math.max(0, Math.round((60 - v.speed) * 0.6));
      v.delaySec += delay;
      totalDelay += v.delaySec;
    });

    // 3. Civilian Behavior & Compliance Calculations
    this.sectorsCompliance = CivilianComplianceEngine.getLiveComplianceGrid(sectors);
    const kpis = CivilianComplianceEngine.calculateComplianceKPIs(this.sectorsCompliance);

    // 4. Police Recommendations Engine
    this.recommendations = PoliceRecommendationEngine.evaluateSectorRisks(this.sectorsCompliance);

    // AI feedback alerts
    if (this.tick % 5 === 0) {
      const lowSectors = this.sectorsCompliance.filter(s => s.complianceScore < 50);
      if (lowSectors.length > 0) {
        this.logAlert(`🧠 Anomaly Detected: Low compliance resistance at ${lowSectors[0].name} slows lane clearing.`);
      }
    }

    // 5. Simulated reinforcement learning curves updates
    const policeDeploys = sectors.filter(s => s.hasPolice).length;
    const unstableSectorsCount = this.sectorsCompliance.filter(s => s.complianceScore < 55).length;
    const learning = EmergencyMobilityAI.runSimulatedLearningIncrement(policeDeploys, unstableSectorsCount);

    const mobilityRating = EmergencyMobilityAI.calculateMobilityRating(
      kpis.cityComplianceIndex,
      totalDelay,
      sectors.filter(s => s.blocked).length
    );

    // 6. Write snapshot to DB
    if (this.runId) {
      await prisma.complianceSnapshot.create({
        data: {
          runId: this.runId,
          tick: this.tick,
          sectorData: JSON.stringify(this.sectorsCompliance),
          recommendations: JSON.stringify(this.recommendations),
          alerts: JSON.stringify(this.alerts.slice(0, 15))
        }
      });
    }

    // 7. Emit WebSocket updates
    if (this.socketIo) {
      this.socketIo.emit('compliance_update', {
        runId: this.runId,
        tick: this.tick,
        time: `${Math.round(this.tick * 1.5)}s`,
        sectors: this.sectorsCompliance,
        vehicles: this.vehicles,
        recommendations: this.recommendations,
        alerts: this.alerts,
        kpis: {
          cityComplianceIndex: kpis.cityComplianceIndex,
          cooperationIndex: kpis.cooperationIndex,
          delayProbability: kpis.delayProbability,
          mobilityRating: mobilityRating,
          learningConfidence: learning.confidence,
          totalLearningRuns: learning.totalRuns
        }
      });
    }

    // 8. Completed runs finalizations
    if (allArrived) {
      this.logAlert('🏆 Compliance run terminated. Finalizing predictive metrics summaries.');
      this.stopRun();

      if (this.runId) {
        await prisma.complianceRun.update({
          where: { id: this.runId },
          data: {
            status: 'COMPLETED',
            cityComplianceIndex: kpis.cityComplianceIndex,
            cooperationIndex: kpis.cooperationIndex,
            delayProbability: kpis.delayProbability,
            mobilityRating: mobilityRating
          }
        });

        if (this.socketIo) {
          this.socketIo.emit('compliance_completed', {
            runId: this.runId,
            analytics: {
              efficiency: mobilityRating,
              delay: totalDelay,
              compliance: kpis.cityComplianceIndex,
              cooperation: kpis.cooperationIndex,
              delayProbability: kpis.delayProbability,
              timelineData: [
                { time: 'T0', compliance: kpis.cityComplianceIndex, confidence: learning.confidence },
                { time: 'T-Final', compliance: kpis.cityComplianceIndex + 5, confidence: learning.confidence + 1.5 }
              ],
              tacticalSummary: `Compliance prediction run finalized. Model Confidence optimized to ${learning.confidence}%. Overall city compliance score index: ${kpis.cityComplianceIndex}%. Dynamic delay index successfully predicted lane clearances across 12 sector zones.`
            }
          });
        }
      }
    }
  }
}
