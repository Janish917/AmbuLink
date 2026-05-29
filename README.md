# AmbuLink — Intelligent Smart-City Emergency Response Infrastructure

AmbuLink is a next-generation smart-city emergency response ecosystem. It transforms emergency management from a standard ambulance routing tool into a centralized, deeply integrated smart grid that manages emergency corridors, dynamically synchronizes traffic signals, balances hospital emergency department loads, and coordinates police clearance actions in real time.

All operational dashboards are fully synchronized under a single source of truth (`GlobalEmergencyStateManager.ts`) running in the backend, ensuring a change in one dashboard (e.g., overloading a hospital or dispatching a compliance patrol) instantly propagates across all systems in real time.

---

## 🏛️ System Architecture

The heart of AmbuLink is the **Centralized Operations Loop**, which orchestrates multiple dynamic systems.

```
                  ┌─────────────────────────────────┐
                  │   GlobalEmergencyStateManager   │
                  └────────────────┬────────────────┘
                                   │ (Unified Tick Loop)
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
 ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
 │   Congestion    │      │  Load Balancer  │      │   Compliance    │
 │   Propagation   │      │     Engine      │      │     Engine      │
 └─────────────────┘      └─────────────────┘      └─────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                       (Unified Socket Broadcast)
                                   │
          ┌───────────────┬────────┴───────┬───────────────┐
          ▼               ▼                ▼               ▼
   ┌─────────────┐ ┌─────────────┐  ┌─────────────┐ ┌─────────────┐
   │  Simulator  │ │ Coordinator │  │  Hospital   │ │   Police    │
   │  Dashboard  │ │  Dashboard  │  │  Dashboard  │ │  Dashboard  │
   └─────────────┘ └─────────────┘  └─────────────┘ └─────────────┘
```

1. **State Synchronization**: A centralized 1.5-second tick loop updates vehicle coordinates, sector congestion densities, hospital ER/ICU loads, and traffic preemption statuses.
2. **Dynamic Cost Triage**: Evaluates travel delays, hospital readiness scores, and ICU bed occupancies to compute real-time survivability cost ratings.
3. **Casacading Operations**: If an obstruction or capacity overload occurs, the system recalculates paths and ETAs and pushes the updates to all screens simultaneously.

---

## 📊 Modules & Dashboards

All dashboards are built with a unified **Top-Middle-Bottom** layout hierarchy for clarity and operational utility.
* **Top Section**: Live Key Performance Indicators (KPIs), operational warnings, and status banners.
* **Middle Section**: Tactical city map, active corridors, and ambulance vectors.
* **Bottom Section**: Chronological event logs, recommendations, and performance charts.

### 1. Emergency Scenario Simulator
* Allows dispatchers to select emergency profiles and adjust tick-rate speeds.
* Tracks live city-wide compliance index, average transit speed, corridor stability, and overload risk.
* Includes a **Mission Database** and **Historical Comparison Tool** to scrub through completed runs.

### 2. Central Fleet Coordinator
* Coordinates multiple active ambulances simultaneously.
* Evaluates overlap coordinates to detect collision or gridlock conflicts at intersections.
* Manages junction signal preemption, showing which traffic lights are locked in green-held sequences.

### 3. Civilian Compliance Analyst
* Predicts civilian clearing behavior during emergencies.
* Analyzes sector compliance scores, obstruction risks, and delay risk probabilities.
* Includes a **Reinforcement Learning Loop** showing model confidence optimization over time.

### 4. Smart Hospital Balancer
* Monitors beds occupancies, ER queues, inflow rates, and ready surgeons.
* Allows operators to force capacity overloads to test redirection capabilities.
* Automatically triggers rerouting when the target emergency department reaches critical pressure.

### 5. Traffic Command View (Police)
* Provides command-level overrides to expand corridor perimeters, preempt green signals, and escalate compliance warnings.
* Heatmap integration displaying real-time civilian clearance cooperation ratings.
* Dynamic event feeds logging roadblocks, obstructions, and preemption confirmations.

---

## 🏎️ Walkthrough: The 3 Scenario Runs

AmbuLink features three predefined demonstration runs to validate smart-city operations.

### Scenario 1: Standard Emergency Run
* **Setup**: A single ambulance dispatch from Connaught Place heading to City General Hospital.
* **Behavior**: Preemption signals lock to `GREEN_HELD` sequence as the ambulance approaches. The vehicle moves smoothly at standard speed (60 km/h).
* **Expected Result**: 100% path stability, zero delays, and smooth hospital intake coordination.

### Scenario 2: Congestion Failure Run
* **Setup**: Flooded underpass or congestion anomaly blocks the main corridor on Tick 3.
* **Behavior**: Sector stability score drops below 60%. The routing system triggers an automatic bypass path transition to the alternate Janpath Bypass corridor.
* **Expected Result**: Live ETA updates on all screens. Alert feeds advise dispatching a police unit to clear the bottleneck.

### Scenario 3: Multi-Ambulance Conflict Run
* **Setup**: Two ambulances dispatched simultaneously on overlapping route paths.
* **Behavior**: The **Corridor Conflict Resolver** detects intersection overlap, assigns priority indexes based on patient severity (e.g. Cardiac Unit Beta given priority over Trauma Unit Alpha), holds CP Signal 2 in red/green sequence, and reroutes the lower-priority ambulance.
* **Expected Result**: Gridlock is avoided. High-priority unit enters green-wave corridor without speed degradation.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15, React, TypeScript, Leaflet Map (2D Vector), Recharts, Framer Motion, Vanilla CSS.
* **Backend**: Node.js, Express, Socket.io (Realtime State Sync), Prisma ORM.
* **Database**: PostgreSQL (Dockerized).

---

## 🚀 Installation & Running

### 1. Start Database Services (Docker)
```bash
docker compose up -d
```

### 2. Install & Start Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Install & Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000` to access the AmbuLink Command Portal.

---

## 👥 Authors

* **Janish** - BTech Computer Science Student, Chandigarh University
* **Himanshu** - BTech CyberSecurity Student, Chandigarh University
