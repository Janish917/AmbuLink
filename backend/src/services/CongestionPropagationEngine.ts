export interface Sector {
  id: string;
  name: string;
  lat: number;
  lng: number;
  density: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  blocked: boolean;
  hasPolice: boolean;
}

export class CongestionPropagationEngine {
  private static sectors: Sector[] = [
    { id: '1', name: 'Connaught Place Center', lat: 28.6139, lng: 77.2090, density: 25, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '2', name: 'Janpath North', lat: 28.6210, lng: 77.2150, density: 30, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '3', name: 'Barakhamba Road', lat: 28.6235, lng: 77.2200, density: 20, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '4', name: 'Ashoka Road', lat: 28.6110, lng: 77.2130, density: 25, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '5', name: 'India Gate Circle', lat: 28.6129, lng: 77.2295, density: 35, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '6', name: 'Tilak Marg', lat: 28.6220, lng: 77.2260, density: 30, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '7', name: 'Pragati Maidan', lat: 28.6150, lng: 77.2400, density: 15, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '8', name: 'Mandir Marg', lat: 28.6250, lng: 77.1950, density: 20, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '9', name: 'Panchkuian Road', lat: 28.6300, lng: 77.2050, density: 25, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '10', name: 'Minto Road', lat: 28.6320, lng: 77.2220, density: 22, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '11', name: 'Parliament Street', lat: 28.6170, lng: 77.2080, density: 20, riskLevel: 'LOW', blocked: false, hasPolice: false },
    { id: '12', name: 'Chanakyapuri', lat: 28.5980, lng: 77.1850, density: 15, riskLevel: 'LOW', blocked: false, hasPolice: false },
  ];

  // Adjacency list mapping sector IDs to connected sector IDs
  private static adjacencyMatrix: Record<string, string[]> = {
    '1': ['2', '4', '8', '9', '11'],
    '2': ['1', '3', '6', '11'],
    '3': ['2', '6', '10'],
    '4': ['1', '5', '11', '12'],
    '5': ['4', '6', '7'],
    '6': ['2', '3', '5', '10'],
    '7': ['5', '6'],
    '8': ['1', '9', '12'],
    '9': ['1', '8', '10'],
    '10': ['3', '6', '9'],
    '11': ['1', '2', '4'],
    '12': ['4', '8'],
  };

  static reset() {
    this.sectors.forEach((s) => {
      s.density = 15 + Math.floor(Math.random() * 20);
      s.blocked = false;
      s.hasPolice = false;
      s.riskLevel = 'LOW';
    });
  }

  static getSectors(): Sector[] {
    return this.sectors;
  }

  static getSector(id: string): Sector | undefined {
    return this.sectors.find((s) => s.id === id);
  }

  static deployPolice(sectorId: string) {
    const s = this.getSector(sectorId);
    if (s) {
      s.hasPolice = true;
      s.density = Math.max(10, s.density - 40); // Instant reduction
    }
  }

  static removePolice(sectorId: string) {
    const s = this.getSector(sectorId);
    if (s) {
      s.hasPolice = false;
    }
  }

  static runPropagationTick(scenarioName: string, intensity: number, tick: number) {
    // 1. Apply scenario baseline effects
    this.applyScenarioPerturbations(scenarioName, intensity, tick);

    // 2. Propagate congestion to neighbors
    const newDensities = [...this.sectors].map(s => s.density);

    this.sectors.forEach((sector, idx) => {
      const neighbors = this.adjacencyMatrix[sector.id] || [];
      if (sector.density > 50) {
        // High density spills over to neighbors
        const spillFactor = (sector.density - 50) * 0.08 * (intensity / 5);
        neighbors.forEach(nId => {
          const nIdx = this.sectors.findIndex(s => s.id === nId);
          if (nIdx !== -1) {
            const neighbor = this.sectors[nIdx];
            // Police reduces incoming spillover
            const reduction = neighbor.hasPolice ? 0.3 : 1.0;
            // Blocked sectors block spillover from entering but increase it internally
            if (!neighbor.blocked) {
              newDensities[nIdx] = Math.min(100, newDensities[nIdx] + (spillFactor * reduction));
            } else {
              // Blocked routes cause backpressure spillover to source
              newDensities[idx] = Math.min(100, newDensities[idx] + spillFactor * 0.5);
            }
          }
        });
      }

      // Police actively clears traffic in their sector
      if (sector.hasPolice) {
        newDensities[idx] = Math.max(15, newDensities[idx] - 15);
      }
    });

    // 3. Update sectors and calculate risk levels
    this.sectors.forEach((s, idx) => {
      s.density = Math.round(Math.min(Math.max(newDensities[idx], 0), 100));

      if (s.blocked || s.density > 75) {
        s.riskLevel = 'HIGH';
      } else if (s.density > 45) {
        s.riskLevel = 'MEDIUM';
      } else {
        s.riskLevel = 'LOW';
      }
    });
  }

  private static applyScenarioPerturbations(scenarioName: string, intensity: number, tick: number) {
    const intensityMultiplier = intensity / 5;

    switch (scenarioName) {
      case 'Citywide Accident': {
        // Random spikes
        if (tick % 4 === 0) {
          const randSec = this.sectors[Math.floor(Math.random() * this.sectors.length)];
          randSec.density = Math.min(100, randSec.density + 30 * intensityMultiplier);
        }
        break;
      }
      case 'Highway Multi-Car Collision': {
        // Major blockage at Sector 4 (Ashoka Road) / Sector 5 (India Gate)
        const sec4 = this.getSector('4');
        const sec5 = this.getSector('5');
        if (sec4 && sec5) {
          if (tick >= 2) {
            sec4.blocked = true;
            sec4.density = Math.min(100, sec4.density + 15 * intensityMultiplier);
          }
          sec5.density = Math.min(100, sec5.density + 8 * intensityMultiplier);
        }
        break;
      }
      case 'Festival Traffic Congestion': {
        // Spikes near Sector 5 (India Gate)
        const sec5 = this.getSector('5');
        if (sec5) {
          sec5.density = Math.min(100, sec5.density + 18 * intensityMultiplier);
          if (tick > 5 && sec5.density > 80) {
            // Also blocks outer areas
            const sec6 = this.getSector('6');
            if (sec6) sec6.density = Math.min(100, sec6.density + 8 * intensityMultiplier);
          }
        }
        break;
      }
      case 'Flooded Road Network': {
        // Pragati Maidan (7) and Minto Road (10) water levels rise
        const sec7 = this.getSector('7');
        const sec10 = this.getSector('10');
        if (sec7 && sec10) {
          sec7.density = Math.min(100, sec7.density + 10 * intensityMultiplier);
          if (tick >= 3) sec7.blocked = true;
          
          sec10.density = Math.min(100, sec10.density + 12 * intensityMultiplier);
          if (tick >= 5) sec10.blocked = true;
        }
        break;
      }
      case 'VIP Convoy Road Blockage': {
        // Sequential blockages along sectors 12 -> 4 -> 11 -> 1
        const route = ['12', '4', '11', '1'];
        const activeIdx = Math.floor(tick / 3) % route.length;
        this.sectors.forEach(s => {
          if (s.id === route[activeIdx]) {
            s.blocked = true;
            s.density = Math.min(100, s.density + 25 * intensityMultiplier);
          } else {
            s.blocked = false;
          }
        });
        break;
      }
      case 'Multi-Ambulance Emergency': {
        // General citywide elevated load
        this.sectors.forEach(s => {
          s.density = Math.min(95, s.density + 3 * intensityMultiplier);
        });
        break;
      }
      case 'Stadium Exit Rush': {
        // Massive sudden surge at Pragati Maidan (7)
        const sec7 = this.getSector('7');
        if (sec7) {
          if (tick === 0) {
            sec7.density = 95;
          } else {
            sec7.density = Math.max(25, sec7.density - 4 * (1 / intensityMultiplier));
          }
        }
        break;
      }
      case 'Fire Emergency Zone': {
        // Janpath North (2) blocks
        const sec2 = this.getSector('2');
        if (sec2) {
          sec2.density = Math.min(100, sec2.density + 14 * intensityMultiplier);
          if (tick >= 1) {
            sec2.blocked = true;
          }
        }
        break;
      }
      case 'Hospital Overflow Crisis': {
        // Tilak Marg (6) near General Hospital jams
        const sec6 = this.getSector('6');
        if (sec6) {
          sec6.density = Math.min(100, sec6.density + 16 * intensityMultiplier);
          if (tick >= 3) {
            sec6.blocked = true; // Jammed entrance
          }
        }
        break;
      }
      case 'Chemical Hazard Route Block': {
        // Toxic Spill at Panchkuian Road (9)
        const sec9 = this.getSector('9');
        if (sec9) {
          sec9.blocked = true;
          sec9.density = 100; // Locked at maximum
        }
        break;
      }
    }
  }

  static getObstructionsForSimulation(scenarioName: string, tick: number): Array<{ id: string, lat: number, lng: number, type: string, details: string }> {
    const list: Array<{ id: string, lat: number, lng: number, type: string, details: string }> = [];
    
    // Convert active blocked sectors into obstruction overlays
    this.sectors.forEach(s => {
      if (s.blocked) {
        let type = 'ROADBLOCK';
        let details = `${s.name} is completely blocked.`;
        
        if (scenarioName === 'Flooded Road Network') {
          type = 'FLOOD';
          details = `Water levels rose. Sector flooded.`;
        } else if (scenarioName === 'Fire Emergency Zone') {
          type = 'CONSTRUCTION'; // Or FIRE if custom, let's map to existing types: ACCIDENT, PROTEST, CONSTRUCTION, FLOOD, ROADBLOCK, VIP_CONVOY
          details = `Hazardous fire rescue in progress.`;
        } else if (scenarioName === 'VIP Convoy Road Blockage') {
          type = 'VIP_CONVOY';
          details = `VIP Motorcade clearing sector.`;
        } else if (scenarioName === 'Highway Multi-Car Collision') {
          type = 'ACCIDENT';
          details = `Multi-vehicle crash blocking lanes.`;
        } else if (scenarioName === 'Chemical Hazard Route Block') {
          type = 'PROTEST'; // toxic spill
          details = `Chemical spill containment. HAZMAT team deployed.`;
        }
        
        list.push({
          id: `obs-${s.id}`,
          lat: s.lat,
          lng: s.lng,
          type,
          details
        });
      }
    });
    
    return list;
  }
}
