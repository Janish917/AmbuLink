import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SimulatedHospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icuBedsTotal: number;
  icuBedsOccupied: number;
  traumaBedsTotal: number;
  traumaBedsOccupied: number;
  erQueueLoad: number;
  doctorsAvailable: number;
  doctorsTotal: number;
  surgeryQueueLoad: number;
  status: 'NORMAL' | 'HIGH_PRESSURE' | 'OVERLOADED';
  overloadProbability: number;
  readinessScore: number;
  estimatedIntakeDelay: number;
  inflow: number;
}

export interface HospitalAmbulance {
  id: string;
  name: string;
  currentLat: number;
  currentLng: number;
  routeIndex: number;
  routePoints: [number, number][];
  status: 'EN_ROUTE' | 'ARRIVED' | 'STUCK';
  speed: number;
  delaySec: number;
  targetHospitalId: string;
  severity: number;
}

export interface HospitalAIRecommendation {
  hospitalId: string;
  hospitalName: string;
  etaSeconds: number;
  intakeDelaySeconds: number;
  survivabilityRating: number;
  overloadProbability: number;
  readinessScore: number;
  costScore: number; // Combined recommendation cost
}

export class HospitalLoadBalancerService {
  private static runId: string | null = null;
  private static speedMultiplier: number = 1;
  private static tick: number = 0;
  private static isRunning: boolean = false;
  private static isPaused: boolean = false;
  private static interval: NodeJS.Timeout | null = null;
  private static socketIo: any = null;

  private static hospitals: SimulatedHospital[] = [];
  private static ambulance: HospitalAmbulance | null = null;
  private static recommendations: HospitalAIRecommendation[] = [];
  private static alerts: string[] = [];
  private static redirectsCount: number = 0;

  // Predefined routes from start coordinate CP Delhi [28.6139, 77.2090]
  private static baseRoutes: Record<string, [number, number][]> = {
    'HOSP-01': [ // City General Hospital
      [28.6139, 77.2090],
      [28.6145, 77.2110],
      [28.6160, 77.2140],
      [28.6190, 77.2180],
      [28.6250, 77.2250]
    ],
    'HOSP-02': [ // Metro Central Medical
      [28.6139, 77.2090],
      [28.6150, 77.2120],
      [28.6180, 77.2170],
      [28.6240, 77.2220],
      [28.6300, 77.2300]
    ],
    'HOSP-03': [ // Safdarjung Trauma Care
      [28.6139, 77.2090],
      [28.6120, 77.2080],
      [28.6100, 77.2090],
      [28.6080, 77.2095],
      [28.6050, 77.2100]
    ],
    'HOSP-04': [ // Apollo Emergency Center
      [28.6139, 77.2090],
      [28.6140, 77.2150],
      [28.6150, 77.2220],
      [28.6170, 77.2350],
      [28.6180, 77.2450]
    ]
  };

  static async initializeRun(speedMultiplier: number, io: any) {
    if (this.isRunning) {
      this.stopRun();
    }

    this.speedMultiplier = speedMultiplier;
    this.socketIo = io;
    this.tick = 0;
    this.redirectsCount = 0;
    this.alerts = [];
    this.isPaused = false;

    // Initialize 4 hospitals with typical values
    this.hospitals = [
      {
        id: 'HOSP-01',
        name: 'City General Hospital',
        lat: 28.6250,
        lng: 77.2250,
        icuBedsTotal: 50,
        icuBedsOccupied: 40,
        traumaBedsTotal: 20,
        traumaBedsOccupied: 12,
        erQueueLoad: 15,
        doctorsAvailable: 8,
        doctorsTotal: 15,
        surgeryQueueLoad: 3,
        status: 'NORMAL',
        overloadProbability: 0,
        readinessScore: 0,
        estimatedIntakeDelay: 0,
        inflow: 0
      },
      {
        id: 'HOSP-02',
        name: 'Metro Central Medical',
        lat: 28.6300,
        lng: 77.2300,
        icuBedsTotal: 60,
        icuBedsOccupied: 48,
        traumaBedsTotal: 25,
        traumaBedsOccupied: 18,
        erQueueLoad: 22,
        doctorsAvailable: 5,
        doctorsTotal: 18,
        surgeryQueueLoad: 6,
        status: 'NORMAL',
        overloadProbability: 0,
        readinessScore: 0,
        estimatedIntakeDelay: 0,
        inflow: 0
      },
      {
        id: 'HOSP-03',
        name: 'Safdarjung Trauma Care',
        lat: 28.6050,
        lng: 77.2100,
        icuBedsTotal: 80,
        icuBedsOccupied: 72,
        traumaBedsTotal: 40,
        traumaBedsOccupied: 35,
        erQueueLoad: 38,
        doctorsAvailable: 3,
        doctorsTotal: 24,
        surgeryQueueLoad: 9,
        status: 'HIGH_PRESSURE',
        overloadProbability: 0,
        readinessScore: 0,
        estimatedIntakeDelay: 0,
        inflow: 0
      },
      {
        id: 'HOSP-04',
        name: 'Apollo Emergency Center',
        lat: 28.6180,
        lng: 77.2450,
        icuBedsTotal: 45,
        icuBedsOccupied: 28,
        traumaBedsTotal: 15,
        traumaBedsOccupied: 6,
        erQueueLoad: 8,
        doctorsAvailable: 9,
        doctorsTotal: 12,
        surgeryQueueLoad: 1,
        status: 'NORMAL',
        overloadProbability: 0,
        readinessScore: 0,
        estimatedIntakeDelay: 0,
        inflow: 0
      }
    ];

    // Compute initial KPIs
    this.hospitals.forEach(h => this.updateHospitalKPIs(h));

    // Choose initial target hospital (lowest cost recommend)
    // Ambulance starts with Cardiac Arrest severity (Level 1)
    const initialRecommendation = this.computeRecommendations([28.6139, 77.2090], 1);
    const bestHospitalId = initialRecommendation[0].hospitalId;

    this.ambulance = {
      id: 'amb-hospital-01',
      name: 'Trauma Unit Echo',
      currentLat: 28.6139,
      currentLng: 77.2090,
      routeIndex: 0,
      routePoints: this.baseRoutes[bestHospitalId] || this.baseRoutes['HOSP-01'],
      status: 'EN_ROUTE',
      speed: 60,
      delaySec: 0,
      targetHospitalId: bestHospitalId,
      severity: 1
    };

    // Update inflow
    this.hospitals.forEach(h => {
      h.inflow = h.id === bestHospitalId ? 1 : 0;
    });

    // Save HospitalAllocationRun in DB
    const run = await prisma.hospitalAllocationRun.create({
      data: {
        status: 'ACTIVE',
        efficiencyScore: 95.0,
        averageIntakeTimeSec: 180,
        redirectsCount: 0
      }
    });

    this.runId = run.id;
    this.isRunning = true;

    this.logAlert('AI Allocation Core: Load Balancing simulation started.');
    this.logAlert(`AI allocation recommendation: Routing ${this.ambulance.name} to ${this.getHospitalName(bestHospitalId)} (Intake Readiness: ${this.getHospitalReadiness(bestHospitalId)}%).`);
    
    this.startInterval();
  }

  static getHospitalName(id: string): string {
    return this.hospitals.find(h => h.id === id)?.name || 'Unknown Hospital';
  }

  static getHospitalReadiness(id: string): number {
    return this.hospitals.find(h => h.id === id)?.readinessScore || 70;
  }

  static logAlert(msg: string) {
    console.log(`[Hospital AI] ${msg}`);
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
        console.error('Error running hospital tick:', e);
      }
    }, delay);
  }

  static pauseRun() {
    this.isPaused = true;
    this.logAlert('Hospital simulation paused.');
    if (this.socketIo) this.socketIo.emit('hospital_paused');
  }

  static resumeRun() {
    this.isPaused = false;
    this.logAlert('Hospital simulation resumed.');
    if (this.socketIo) this.socketIo.emit('hospital_resumed');
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

  static forceOverload(hospitalId: string) {
    const h = this.hospitals.find(x => x.id === hospitalId);
    if (h) {
      h.icuBedsOccupied = h.icuBedsTotal;
      h.traumaBedsOccupied = h.traumaBedsTotal;
      h.erQueueLoad = Math.round(h.icuBedsTotal * 0.9);
      h.doctorsAvailable = 0;
      h.surgeryQueueLoad = 12;
      h.status = 'OVERLOADED';
      this.updateHospitalKPIs(h);
      this.logAlert(`⚠️ Operator Trigger: Forced total OVERLOAD state at ${h.name}.`);
      
      // If our ambulance is currently heading there, trigger dynamic redirection immediately!
      if (this.ambulance && this.ambulance.targetHospitalId === hospitalId && this.ambulance.status === 'EN_ROUTE') {
        this.triggerDynamicRerouting('Forced target hospital overload override');
      } else {
        if (this.socketIo) this.emitUpdates();
      }
    }
  }

  static updateHospitalKPIs(h: SimulatedHospital) {
    const icuOccRatio = h.icuBedsOccupied / h.icuBedsTotal;
    const traumaOccRatio = h.traumaBedsOccupied / h.traumaBedsTotal;
    const doctorsOccRatio = (h.doctorsTotal - h.doctorsAvailable) / h.doctorsTotal;

    // Overload probability
    let overloadProb = (icuOccRatio * 0.4) + (traumaOccRatio * 0.3) + (doctorsOccRatio * 0.2) + (h.erQueueLoad * 0.015);
    if (h.status === 'OVERLOADED') overloadProb = 1.0;
    h.overloadProbability = Math.round(Math.min(Math.max(overloadProb * 100, 0), 100));

    // Status mapping
    if (h.overloadProbability >= 90) {
      h.status = 'OVERLOADED';
    } else if (h.overloadProbability >= 65) {
      h.status = 'HIGH_PRESSURE';
    } else {
      h.status = 'NORMAL';
    }

    // Estimated Intake Delay (seconds)
    const baseDelay = h.status === 'OVERLOADED' ? 1200 : h.status === 'HIGH_PRESSURE' ? 450 : 60;
    const additionalDelay = h.erQueueLoad * 30 + h.surgeryQueueLoad * 90 + h.inflow * 120;
    h.estimatedIntakeDelay = Math.round(baseDelay + additionalDelay);

    // Readiness Score (0-100%)
    const readiness = 100 - (h.overloadProbability * 0.6) - (h.estimatedIntakeDelay * 0.03);
    h.readinessScore = Math.round(Math.min(Math.max(readiness, 5), 100));
  }

  static computeRecommendations(loc: [number, number], severity: number): HospitalAIRecommendation[] {
    return this.hospitals.map(h => {
      // Calculate straight line distance as mock for road distance
      const distanceKm = Math.sqrt(Math.pow(loc[0] - h.lat, 2) + Math.pow(loc[1] - h.lng, 2)) * 111.32;
      const speedKmH = 45; // average speed
      const travelTimeSeconds = Math.round((distanceKm / speedKmH) * 3600);

      // Survivability formula
      // Patient survivability decreases with travel time + intake delay + severity factor
      const intakeSec = h.estimatedIntakeDelay;
      const survivability = Math.max(5, 100 - (travelTimeSeconds * 0.015) - (intakeSec * 0.02) - (severity * 4));

      // Multi-criteria optimization cost score (lower is better)
      // cost = travel time (weight 0.4) + intake delay (weight 0.6)
      const cost = (travelTimeSeconds * 0.4) + (intakeSec * 0.6);

      return {
        hospitalId: h.id,
        hospitalName: h.name,
        etaSeconds: travelTimeSeconds,
        intakeDelaySeconds: intakeSec,
        survivabilityRating: Math.round(survivability),
        overloadProbability: h.overloadProbability,
        readinessScore: h.readinessScore,
        costScore: Math.round(cost)
      };
    }).sort((a, b) => a.costScore - b.costScore); // Sort by lowest cost score
  }

  static triggerDynamicRerouting(reason: string) {
    if (!this.ambulance) return;

    this.redirectsCount++;
    const oldHospitalId = this.ambulance.targetHospitalId;
    const oldHospitalName = this.getHospitalName(oldHospitalId);

    // Re-evaluate target hospitals
    const recs = this.computeRecommendations([this.ambulance.currentLat, this.ambulance.currentLng], this.ambulance.severity);
    
    // Choose the best hospital that is NOT overloaded and NOT the old one if possible
    let bestRec = recs.find(r => r.hospitalId !== oldHospitalId && r.overloadProbability < 90);
    if (!bestRec) {
      bestRec = recs[0]; // fallback to absolute best cost even if busy
    }

    const newHospitalId = bestRec.hospitalId;
    const newHospitalName = bestRec.hospitalName;

    this.ambulance.targetHospitalId = newHospitalId;

    // Dynamically calculate the path from current location to new hospital
    // To represent this beautifully on map, we generate a smooth path of 4 nodes
    const startLat = this.ambulance.currentLat;
    const startLng = this.ambulance.currentLng;
    const endLat = this.hospitals.find(h => h.id === newHospitalId)!.lat;
    const endLng = this.hospitals.find(h => h.id === newHospitalId)!.lng;

    const dynamicPath: [number, number][] = [
      [startLat, startLng],
      [startLat + (endLat - startLat) * 0.33, startLng + (endLng - startLng) * 0.33],
      [startLat + (endLat - startLat) * 0.66, startLng + (endLng - startLng) * 0.66],
      [endLat, endLng]
    ];

    this.ambulance.routePoints = dynamicPath;
    this.ambulance.routeIndex = 0;

    // Recalculate inflows
    this.hospitals.forEach(h => {
      h.inflow = h.id === newHospitalId ? 1 : 0;
    });

    this.logAlert(`🚨 AI REDIRECTION ENGAGED: Rerouted from overloaded ${oldHospitalName} to ${newHospitalName}.`);
    this.logAlert(`AI Action: Updated emergency corridor parameters for ${newHospitalName} (Est. Survivability: ${bestRec.survivabilityRating}%).`);

    if (this.socketIo) {
      this.socketIo.emit('hospital_redirected', {
        ambulance: this.ambulance,
        oldHospitalId,
        newHospitalId,
        reason
      });
    }
  }

  static async runTick() {
    if (!this.ambulance) return;

    this.tick++;

    // 1. Random walk changes on hospitals beds and queues to simulate smart city load fluctuations
    this.hospitals.forEach(h => {
      // ICU bed fluctuations
      if (Math.random() > 0.6) {
        const delta = Math.random() > 0.55 ? 1 : -1;
        h.icuBedsOccupied = Math.min(h.icuBedsTotal, Math.max(0, h.icuBedsOccupied + delta));
      }
      // Trauma bed fluctuations
      if (Math.random() > 0.65) {
        const delta = Math.random() > 0.55 ? 1 : -1;
        h.traumaBedsOccupied = Math.min(h.traumaBedsTotal, Math.max(0, h.traumaBedsOccupied + delta));
      }
      // ER queue load shifts
      if (Math.random() > 0.5) {
        const delta = Math.random() > 0.5 ? 2 : -2;
        h.erQueueLoad = Math.min(80, Math.max(0, h.erQueueLoad + delta));
      }
      // Available doctors shifts
      if (Math.random() > 0.7) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        h.doctorsAvailable = Math.min(h.doctorsTotal, Math.max(0, h.doctorsAvailable + delta));
      }
      // Surgery queue loads shifts
      if (Math.random() > 0.6) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        h.surgeryQueueLoad = Math.min(20, Math.max(0, h.surgeryQueueLoad + delta));
      }

      // Recompute KPIs
      this.updateHospitalKPIs(h);
    });

    // 2. Check if current target hospital is overloaded.
    const currentTarget = this.hospitals.find(x => x.id === this.ambulance!.targetHospitalId);
    if (currentTarget && currentTarget.status === 'OVERLOADED') {
      this.triggerDynamicRerouting('Target hospital capacity overload detected during en-route transit.');
    }

    // 3. Advance ambulance position
    let arrived = false;
    const amb = this.ambulance;

    amb.routeIndex++;
    if (amb.routeIndex >= amb.routePoints.length) {
      amb.status = 'ARRIVED';
      amb.routeIndex = amb.routePoints.length - 1;
      amb.currentLat = amb.routePoints[amb.routeIndex][0];
      amb.currentLng = amb.routePoints[amb.routeIndex][1];
      amb.speed = 0;
      arrived = true;
      
      const targetName = this.getHospitalName(amb.targetHospitalId);
      this.logAlert(`🏆 Trauma Unit Alpha safely arrived at ${targetName}. Intake sequence synchronized.`);
    } else {
      amb.currentLat = amb.routePoints[amb.routeIndex][0];
      amb.currentLng = amb.routePoints[amb.routeIndex][1];
      
      // Speed scales based on current target hospital readiness score
      const readiness = this.getHospitalReadiness(amb.targetHospitalId);
      amb.speed = Math.max(20, Math.round(readiness * 0.75));
      const delay = Math.max(0, Math.round((60 - amb.speed) * 0.5));
      amb.delaySec += delay;
    }

    // 4. Compute AI recommendations
    this.recommendations = this.computeRecommendations([amb.currentLat, amb.currentLng], amb.severity);

    // AI feedback warnings
    if (this.tick % 4 === 0) {
      const busyHospitals = this.hospitals.filter(h => h.status !== 'NORMAL');
      if (busyHospitals.length > 0) {
        this.logAlert(`🧠 AI Predictor: High resource pressure detected at ${busyHospitals[0].name}. Rerouting vectors active.`);
      }
    }

    // 5. Write snapshot to DB
    if (this.runId) {
      await prisma.hospitalAllocationSnapshot.create({
        data: {
          runId: this.runId,
          tick: this.tick,
          hospitalData: JSON.stringify(this.hospitals),
          activeAllocations: JSON.stringify(this.ambulance),
          recommendations: JSON.stringify(this.recommendations),
          alerts: JSON.stringify(this.alerts.slice(0, 15))
        }
      });
    }

    // 6. Emit Socket.io updates
    this.emitUpdates();

    // 7. Completed run finalization
    if (arrived) {
      this.stopRun();
      if (this.runId) {
        const finalReadiness = this.getHospitalReadiness(amb.targetHospitalId);
        
        await prisma.hospitalAllocationRun.update({
          where: { id: this.runId },
          data: {
            status: 'COMPLETED',
            efficiencyScore: Math.round(finalReadiness * 0.95),
            averageIntakeTimeSec: Math.round(currentTarget?.estimatedIntakeDelay || 180),
            redirectsCount: this.redirectsCount
          }
        });

        if (this.socketIo) {
          const finalHospital = this.hospitals.find(h => h.id === amb.targetHospitalId);
          this.socketIo.emit('hospital_completed', {
            runId: this.runId,
            analytics: {
              efficiency: Math.round(finalReadiness * 0.95),
              intakeDelay: finalHospital?.estimatedIntakeDelay || 120,
              redirectsCount: this.redirectsCount,
              icuPressure: finalHospital?.icuBedsOccupied || 10,
              hospitalName: finalHospital?.name || 'City General Hospital',
              tacticalSummary: `Hospital Load Balancing execution completed successfully. Redirection Count: ${this.redirectsCount}. Destination Hospital: ${finalHospital?.name} with ${finalHospital?.readinessScore}% intake readiness rating. Delay risk predicted and fully mitigated.`
            }
          });
        }
      }
    }
  }

  private static emitUpdates() {
    if (!this.socketIo || !this.ambulance) return;

    const currentTarget = this.hospitals.find(h => h.id === this.ambulance!.targetHospitalId);
    
    // Calculate global average intake delay and metrics
    const avgDelay = Math.round(this.hospitals.reduce((acc, h) => acc + h.estimatedIntakeDelay, 0) / this.hospitals.length);
    const avgReadiness = Math.round(this.hospitals.reduce((acc, h) => acc + h.readinessScore, 0) / this.hospitals.length);

    this.socketIo.emit('hospital_update', {
      runId: this.runId,
      tick: this.tick,
      time: `${Math.round(this.tick * 1.5)}s`,
      hospitals: this.hospitals,
      ambulance: this.ambulance,
      recommendations: this.recommendations,
      alerts: this.alerts,
      kpis: {
        globalIntakeDelay: avgDelay,
        globalReadiness: avgReadiness,
        redirectsCount: this.redirectsCount,
        activeInflow: 1,
        targetHospitalName: currentTarget?.name || 'Unknown',
        targetReadiness: currentTarget?.readinessScore || 80
      }
    });
  }
}
