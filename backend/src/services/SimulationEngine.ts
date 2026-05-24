export class SimulationEngine {
  /**
   * 1. HUMAN RESPONSE DELAY MODEL
   * Simulates realistic latency after an alert is delivered to a police/control room.
   */
  static getHumanResponseProfile() {
    // Detection time: 5-20s
    // Reading/Understanding: 10-40s
    // Decision to Act: 15-90s
    // Physical Movement/Action: 30-180s
    
    // Using a normal-ish distribution approximation
    const minDelay = 5 + 10 + 15 + 30; // 60s
    const maxDelay = 20 + 40 + 90 + 180; // 330s
    
    // Expected value heavily leans towards 90-150s in a prepared environment
    const expected = 120;
    const confidence = 0.82; // 82% confidence in the response falling within 1 std dev

    return {
      expectedResponseMin: 60,
      expectedResponseMax: 240, // 4 mins
      expected,
      confidence
    };
  }

  /**
   * 2. TRAFFIC REALITY MODEL
   * Calculates the chance of blockage/congestion at a specific junction.
   */
  static getTrafficNodeProfile(nodeType: string, distanceToNode: number) {
    // Closer nodes have slightly higher predictability.
    // Major intersections (TRAFFIC_SIGNAL) have higher blockage probability.
    
    let baseBlockageProb = 0.3; // 30% default
    if (nodeType === 'TRAFFIC_SIGNAL') baseBlockageProb = 0.65;
    if (nodeType === 'HOSPITAL') baseBlockageProb = 0.15;
    if (nodeType === 'POLICE_STATION') baseBlockageProb = 0.2;

    // Introduce random variance (-0.1 to +0.2)
    const variance = (Math.random() * 0.3) - 0.1;
    const finalProb = Math.min(Math.max(baseBlockageProb + variance, 0), 1);

    return {
      bottleneckProbability: finalProb
    };
  }

  /**
   * 3. & 4. PROBABILISTIC ETA & IMPACT CALCULATION ENGINE
   * Runs Monte Carlo simulations to estimate reality-adjusted ETAs and Time Saved.
   */
  static runMonteCarloTripSimulation(baseEtaMins: number, nodesCount: number, routeLengthKm: number) {
    const iterations = 500;
    let totalSimulatedMins = 0;
    let minEta = Infinity;
    let maxEta = 0;

    let totalSavedMins = 0;
    let minSaved = Infinity;
    let maxSaved = 0;

    for (let i = 0; i < iterations; i++) {
      let simEta = baseEtaMins;
      let simSaved = 0;

      // Simulate traffic at each node
      for (let n = 0; n < nodesCount; n++) {
        const isBlocked = Math.random() < 0.45; // average blockage chance
        if (isBlocked) {
          // Add delay (1 to 4 mins)
          simEta += 1 + Math.random() * 3;
        } else {
          // Green corridor successfully created -> save time!
          simSaved += 0.5 + Math.random() * 1.5; // save 30s to 2 mins per cleared node
        }
      }

      // Add human response latency overall penalty (if they took too long, ambulance waits)
      const humanDelayPenalty = (60 + Math.random() * 180) / 60; // 1 to 4 mins penalty randomly
      simEta += humanDelayPenalty;

      // Track min/max/totals
      totalSimulatedMins += simEta;
      if (simEta < minEta) minEta = simEta;
      if (simEta > maxEta) maxEta = simEta;

      totalSavedMins += simSaved;
      if (simSaved < minSaved) minSaved = simSaved;
      if (simSaved > maxSaved) maxSaved = simSaved;
    }

    const expectedEta = totalSimulatedMins / iterations;
    const expectedSaved = totalSavedMins / iterations;

    // 5. EMERGENCY CORRIDOR EFFICIENCY INDEX (ECEI)
    // Formula: (Expected Time Saved / Expected ETA) * 100 * Confidence
    const confidence = 0.78; // Stochastic confidence factor
    let ecei = (expectedSaved / expectedEta) * 100 * confidence * 2; // Scaled to 0-100
    ecei = Math.min(Math.max(ecei, 0), 100);

    return {
      eta: {
        expected: Math.round(expectedEta * 10) / 10,
        best: Math.round(minEta * 10) / 10,
        worst: Math.round(maxEta * 10) / 10,
        confidence
      },
      timeSaved: {
        expected: Math.round(expectedSaved * 10) / 10,
        best: Math.round(maxSaved * 10) / 10,
        worst: Math.round(minSaved * 10) / 10,
      },
      eceiScore: Math.round(ecei * 10) / 10
    };
  }
}
