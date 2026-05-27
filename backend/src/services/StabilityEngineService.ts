import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StabilityEngineParams {
  trafficDensity: number;      // 0-100
  ambulanceSpeed: number;      // km/h
  signalPreemptionCount: number; // how many signals green/preempted
  totalSignals: number;        // total signals on path
  civilianCompliance: number;  // 0-100
  obstructionCount: number;    // active obstructions count
  rerouteProbability: number;  // 0-100
  emergencyPressure: number;   // 0-100
}

export class StabilityEngineService {
  /**
   * Calculates a dynamic Corridor Stability Score (%) based on smart city parameters.
   */
  static calculateStability(params: StabilityEngineParams) {
    // 1. Calculate component scores
    const speedScore = Math.min((params.ambulanceSpeed / 75) * 100, 100);
    const signalRatio = params.totalSignals > 0 ? (params.signalPreemptionCount / params.totalSignals) : 1.0;
    const signalScore = signalRatio * 100;
    
    // Deductions
    const densityDeduction = params.trafficDensity * 0.3; // max 30% deduction
    const rerouteDeduction = params.rerouteProbability * 0.25; // max 25% deduction
    const complianceFactor = (100 - params.civilianCompliance) * 0.2; // max 20% deduction for poor compliance
    const pressureDeduction = params.emergencyPressure * 0.15; // max 15% deduction
    const obstructionDeduction = params.obstructionCount * 20; // 20% deduction per blockage

    // Calculate base stability (nominal is 100%)
    let baseStability = 100 - densityDeduction - rerouteDeduction - complianceFactor - pressureDeduction - obstructionDeduction;
    
    // Mix with telemetry performances
    let finalScore = (baseStability * 0.6) + (speedScore * 0.2) + (signalScore * 0.2);
    
    // Ensure boundary constraints [0, 100]
    finalScore = Math.max(0, Math.min(100, finalScore));
    const stabilityScore = Math.round(finalScore);

    // Determine Congestion Risk level
    let congestionRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (params.trafficDensity > 75 || params.obstructionCount > 0) {
      congestionRisk = 'HIGH';
    } else if (params.trafficDensity > 45) {
      congestionRisk = 'MEDIUM';
    }

    // Determine Signal Grid Status description
    let signalGridStatus: string = 'STABLE';
    if (signalRatio === 0) {
      signalGridStatus = 'SIGNAL DELAY DETECTED';
    } else if (signalRatio < 0.6) {
      signalGridStatus = 'UNSTABLE';
    } else if (signalRatio < 1.0) {
      signalGridStatus = 'PARTIAL PREEMPTION';
    }

    return {
      stabilityScore,
      congestionRisk,
      signalGridStatus
    };
  }

  // --- DATABASE LOGGING METHODS ---

  static async logStabilityHistory(sessionId: string, score: number, risk: string, signalStatus: string, rerouteProb: number) {
    try {
      return await prisma.corridorStabilityHistory.create({
        data: {
          sessionId,
          stabilityScore: score,
          congestionRisk: risk,
          signalGridStatus: signalStatus,
          rerouteProbability: rerouteProb
        }
      });
    } catch (err) {
      console.error('Failed to log stability history:', err);
    }
  }

  static async logCongestionSnapshot(sessionId: string, density: number, riskLevel: string) {
    try {
      return await prisma.congestionSnapshot.create({
        data: {
          sessionId,
          density,
          riskLevel
        }
      });
    } catch (err) {
      console.error('Failed to log congestion snapshot:', err);
    }
  }

  static async logEmergencyPressure(sessionId: string, pressureScore: number) {
    try {
      return await prisma.emergencyPressureLog.create({
        data: {
          sessionId,
          pressureScore
        }
      });
    } catch (err) {
      console.error('Failed to log emergency pressure:', err);
    }
  }

  static async logRerouteTrigger(sessionId: string, triggerType: 'AUTO' | 'MANUAL', reason: string, oldRoute?: string, newRoute?: string) {
    try {
      return await prisma.rerouteTrigger.create({
        data: {
          sessionId,
          triggerType,
          reason,
          oldRoute,
          newRoute
        }
      });
    } catch (err) {
      console.error('Failed to log reroute trigger:', err);
    }
  }

  static async logPoliceIntervention(sessionId: string, actionType: string, details?: string) {
    try {
      return await prisma.policeIntervention.create({
        data: {
          sessionId,
          actionType,
          details
        }
      });
    } catch (err) {
      console.error('Failed to log police intervention:', err);
    }
  }
}
