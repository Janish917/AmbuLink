export interface AnalyticsResult {
  efficiencyScore: number;
  averageDelaySec: number;
  rerouteCount: number;
  averageStability: number;
  policeEffectiveness: number;
  recoveryDurationMin: number;
  timelineData: Array<{
    tick: number;
    time: string;
    stability: number;
    density: number;
    delay: number;
  }>;
  tacticalSummary: string;
}

export class ResponseAnalyticsService {
  static generateReport(
    snapshots: any[],
    intensity: number,
    aiAggression: string
  ): AnalyticsResult {
    if (snapshots.length === 0) {
      return {
        efficiencyScore: 85,
        averageDelaySec: 90,
        rerouteCount: 1,
        averageStability: 82,
        policeEffectiveness: 80,
        recoveryDurationMin: 12,
        timelineData: [],
        tacticalSummary: 'Simulation completed with standard parameters. Dynamic response logs empty.'
      };
    }

    let totalStability = 0;
    let totalDensity = 0;
    let totalDelay = 0;
    let maxReroutes = 0;
    let policeActionsCount = 0;

    const timelineData = snapshots.map((snap) => {
      // Parse JSON fields
      let ambList: any[] = [];
      let blocks: any[] = [];
      let events: any[] = [];
      let sectors: any[] = [];

      try { ambList = JSON.parse(snap.ambulancePos || '[]'); } catch (e) {}
      try { blocks = JSON.parse(snap.blockages || '[]'); } catch (e) {}
      try { events = JSON.parse(snap.events || '[]'); } catch (e) {}
      try { sectors = JSON.parse(snap.heatmapData || '[]'); } catch (e) {}

      // Average stability & delay for this tick
      let tickStability = 0;
      let tickDelay = 0;
      let activeAmbs = ambList.filter(a => a.status === 'EN_ROUTE');

      if (activeAmbs.length > 0) {
        tickStability = activeAmbs.reduce((acc, a) => acc + (a.stabilityScore || 90), 0) / activeAmbs.length;
        tickDelay = activeAmbs.reduce((acc, a) => acc + (a.delayAccumulatedSec || 0), 0) / activeAmbs.length;
      } else {
        tickStability = 95;
        tickDelay = totalDelay / (snapshots.indexOf(snap) || 1); // hold last value
      }

      // Average sector density
      const tickDensity = sectors.length > 0 ? sectors.reduce((acc, s) => acc + s.density, 0) / sectors.length : 25;

      // Count reroutes in the snapshots
      ambList.forEach(a => {
        if (a.usingBackup) maxReroutes = Math.max(maxReroutes, 1);
      });

      // Count police interventions in events
      events.forEach((msg: string) => {
        if (msg.includes('Police') || msg.includes('POLICE')) {
          policeActionsCount++;
        }
      });

      totalStability += tickStability;
      totalDensity += tickDensity;
      totalDelay = Math.max(totalDelay, tickDelay); // Delay is cumulative, take max

      return {
        tick: snap.tick,
        time: `${Math.round(snap.tick * 1.5)}s`,
        stability: Math.round(tickStability),
        density: Math.round(tickDensity),
        delay: Math.round(tickDelay)
      };
    });

    const numTicks = snapshots.length;
    const avgStability = Math.round(totalStability / numTicks);
    const avgDensity = Math.round(totalDensity / numTicks);
    const finalDelay = Math.round(totalDelay);

    // Calculate Response Efficiency Score (Starts at 100)
    // Penalize delays and stability drops. Reward police interventions.
    let efficiency = 100 - (finalDelay * 0.08) - (100 - avgStability) * 0.4 - (intensity * 1.5);
    
    // Add bonus for police deployments
    efficiency += Math.min(15, policeActionsCount * 3);
    efficiency = Math.round(Math.min(Math.max(efficiency, 20), 100));

    // Police effectiveness
    // How well police deployments managed the hotspots
    let policeEffectiveness = 70;
    if (policeActionsCount > 0) {
      policeEffectiveness = Math.min(100, 70 + policeActionsCount * 8 - intensity * 2);
    } else {
      policeEffectiveness = Math.max(40, 60 - intensity * 5); // very low if high intensity and no police
    }

    // Traffic recovery duration (simulated duration in minutes to clear)
    const recoveryDuration = Math.round(intensity * 2.0 + (100 - avgStability) * 0.15 + (12 - Math.min(12, policeActionsCount)));

    // Generate Tactical Summary Paragraph
    const priorityLabel = intensity > 7 ? 'CRITICAL FORCE LEVEL' : intensity > 4 ? 'ELEVATED THREAT LEVEL' : 'STANDARD FORCE LEVEL';
    const tacticalSummary = `Smart-City emergency response operations executed under ${priorityLabel} with ${aiAggression} AI aggression constraints. Total ambulance delay capped at ${finalDelay} seconds. Overall corridor clearance efficiency scored at ${efficiency}%, maintaining average stability index of ${avgStability}%. AI-triggered route changes successfully bypassed ${maxReroutes} primary gridlocks. Traffic recovery duration predicted at ${recoveryDuration} minutes post-mission clearance.`;

    return {
      efficiencyScore: efficiency,
      averageDelaySec: finalDelay,
      rerouteCount: maxReroutes,
      averageStability: avgStability,
      policeEffectiveness: Math.round(policeEffectiveness),
      recoveryDurationMin: recoveryDuration,
      timelineData,
      tacticalSummary
    };
  }
}
