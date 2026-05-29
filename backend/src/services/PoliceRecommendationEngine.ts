import { SectorLiveCompliance } from './CivilianComplianceEngine';
import { SectorBehaviorAnalyzer } from './SectorBehaviorAnalyzer';

export interface ComplianceRecommendation {
  id: string;
  timestamp: string;
  type: 'DEPLOY_POLICE' | 'PUBLIC_ALERT' | 'WIDEN_CORRIDOR' | 'SIGNAL_OVERRIDE';
  message: string;
  sectorId: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class PoliceRecommendationEngine {
  static evaluateSectorRisks(
    grid: SectorLiveCompliance[]
  ): ComplianceRecommendation[] {
    const recs: ComplianceRecommendation[] = [];
    const timeStr = new Date().toLocaleTimeString();

    grid.forEach(sec => {
      const profile = SectorBehaviorAnalyzer.getProfile(sec.id);
      
      // If compliance drops below 55% in a market zone, recommend immediate police deployment
      if (sec.complianceScore < 55) {
        if (profile.profile === 'MARKET') {
          recs.push({
            id: `rec-com-${sec.id}-market`,
            timestamp: timeStr,
            type: 'DEPLOY_POLICE',
            message: `👮 AI Recommendation: Deploy Central Police patrol to ${sec.name} (Sector ${sec.id}) immediately to clear market lane obstructions.`,
            sectorId: sec.id,
            urgency: 'HIGH'
          });
          
          recs.push({
            id: `rec-com-${sec.id}-widen`,
            timestamp: timeStr,
            type: 'WIDEN_CORRIDOR',
            message: `📢 Alert: Compliance dropping below 50% in Sector ${sec.id}. Suggest widening emergency corridor radius by +300m.`,
            sectorId: sec.id,
            urgency: 'MEDIUM'
          });
        } else {
          recs.push({
            id: `rec-com-${sec.id}-deploy`,
            timestamp: timeStr,
            type: 'DEPLOY_POLICE',
            message: `👮 Suggest deploying escort units near ${sec.name} to mitigate compliance resistance.`,
            sectorId: sec.id,
            urgency: 'MEDIUM'
          });
        }
      }

      // If obstruction probability is high, recommend signal overrides or alerts
      if (sec.obstructionScore > 70) {
        recs.push({
          id: `rec-com-${sec.id}-signal`,
          timestamp: timeStr,
          type: 'SIGNAL_OVERRIDE',
          message: `🚦 Preemption Sync: Enforce green wave preemption lock at Sector ${sec.id} to flush out queuing traffic prior to ambulance arrival.`,
          sectorId: sec.id,
          urgency: 'HIGH'
        });

        recs.push({
          id: `rec-com-${sec.id}-alert`,
          timestamp: timeStr,
          type: 'PUBLIC_ALERT',
          message: `🔊 Broadcast: Trigger localized public alerts to warning drivers within 600m of ${sec.name} to evacuate primary lanes.`,
          sectorId: sec.id,
          urgency: 'MEDIUM'
        });
      }
    });

    return recs;
  }
}
