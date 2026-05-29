import { SectorLiveCompliance } from './CivilianComplianceEngine';

export class EmergencyMobilityAI {
  private static modelConfidence: number = 72; // Initial simulated learning confidence %
  private static historicalRunsCount: number = 24;

  static getModelConfidence() {
    return this.modelConfidence;
  }

  static getHistoryCount() {
    return this.historicalRunsCount;
  }

  static runSimulatedLearningIncrement(
    policeDeploysCount: number,
    unstableCount: number
  ) {
    // If police were deployed to clear bottlenecks, the system learns how compliance improves
    if (policeDeploysCount > 0 && unstableCount === 0) {
      // Model improves confidence as predictions align with clearances
      this.modelConfidence = Math.min(98, this.modelConfidence + 1.2 * policeDeploysCount);
    } else if (unstableCount > 2) {
      // Model corrects itself on failure, slightly increasing search weights (confidence goes up as it recalibrates)
      this.modelConfidence = Math.min(98, this.modelConfidence + 0.5);
    }
    
    // Increment total learning runs
    this.historicalRunsCount++;

    return {
      confidence: Math.round(this.modelConfidence * 10) / 10,
      totalRuns: this.historicalRunsCount
    };
  }

  static calculateMobilityRating(
    cityCompliance: number,
    averageDelaySec: number,
    obstructionCount: number
  ): number {
    // Mobility score out of 100
    // Starts high, penalized by delays and low compliance
    let rating = cityCompliance * 0.7 - averageDelaySec * 0.15 - obstructionCount * 12;
    rating = Math.round(Math.min(Math.max(rating, 10), 100));
    return rating;
  }
}
