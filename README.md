# AmbuLink

AmbuLink is a smart ambulance traffic management system made to reduce delays during emergencies by creating faster and smoother routes for ambulances.

The main idea behind this project is to improve coordination between ambulance drivers, traffic police, and hospitals so that emergency vehicles can reach patients and hospitals faster.

---

## Why I Made This

In many cities, ambulances get stuck in traffic even during critical situations. Sometimes traffic signals are not cleared on time, people don’t notice ambulances early, and hospitals are not prepared before the patient arrives.

This project tries to solve that problem using live tracking, traffic coordination, and route prediction.

---

# Features

### Driver Dashboard

* Start emergency sessions
* View live optimized routes
* Select nearby hospitals
* Track estimated arrival time
* Real-time emergency status updates

### Police Dashboard

* Monitor ambulance movement
* Control traffic junctions
* Create green corridors
* View live city map and route activity

### Hospital Dashboard

* Receive ambulance alerts
* Track incoming emergency cases
* Prepare hospital resources in advance

---

# Tech Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Framer Motion
* Three.js

## Backend

* Node.js
* Express.js
* Prisma ORM

## Database & Services

* PostgreSQL
* Redis
* MQTT Broker
* Docker

---

# Working

The ambulance sends live location data to the backend.

The backend calculates:

* fastest route
* traffic conditions
* possible delays
* nearby traffic nodes

Traffic control systems and hospitals receive updates in real time.

The project also uses simulation logic to estimate route efficiency and emergency response timing.

---

# Project Structure

```bash id="8msvjc"
AmbuLink/
│
├── frontend/
├── backend/
├── services/
├── packages/
└── docker-compose.yml
```

---

# Installation

## Clone Repository

```bash id="4m6b4w"
git clone https://github.com/Janish917/AmbuLink.git
cd AmbuLink
```

---

## Install Dependencies

### Frontend

```bash id="jlwm1h"
cd frontend
npm install
```

### Backend

```bash id="6v78qd"
cd backend
npm install
```

---

## Run Project

### Start Docker Services

```bash id="pkz2tp"
docker compose up
```

### Run Frontend

```bash id="rfh2f1"
cd frontend
npm run dev
```

### Run Backend

```bash id="hpr1tv"
cd backend
npm run dev
```

---

# Future Improvements

* AI-based traffic prediction
* Real GPS integration
* Mobile app support
* Smart traffic signal hardware integration
* Better emergency analytics

---

# Author

Janish
BTech CSE Student
Chandigarh University

Himanshu 
BTech CyberSecurity Student
Chandigarh University
