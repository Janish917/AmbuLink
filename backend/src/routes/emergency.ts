import express from 'express';
import { PrismaClient } from '@prisma/client';
import { SessionRecordingService } from '../services/SessionRecordingService';

const router = express.Router();
const prisma = new PrismaClient();

// Get historical emergency sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.emergencySession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: { name: true, driverId: true }
        }
      }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed historical data for the Replay System
router.post('/seed', async (req, res) => {
  try {
    // Find driver
    const driver = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    if (!driver) {
      return res.status(400).json({ error: 'No driver found to associate session with.' });
    }

    // Create a mock session
    const session = await prisma.emergencySession.create({
      data: {
        driverId: driver.id,
        status: 'COMPLETED',
        severity: 4,
        startLat: 40.7128,
        startLng: -74.0060,
        endLat: 40.7580,
        endLng: -73.9855,
        eceiScore: 92.5, // 92.5% efficiency
        etaExpected: 12 * 60, // 12 mins
        etaBest: 10 * 60,
        etaWorst: 15 * 60,
        etaConfidence: 0.88,
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3600000 + (12 * 60000)),
      }
    });

    // Create some logs
    await prisma.activityLog.createMany({
      data: [
        { action: 'EMERGENCY_INITIATED', userId: driver.id, details: 'Route calculated to Central Hosp.' },
        { action: 'SIGNAL_OVERRIDE', userId: null, details: 'AI preempted Junction 4A' },
        { action: 'EMERGENCY_COMPLETED', userId: driver.id, details: 'Ambulance arrived at destination.' }
      ]
    });

    res.json({ message: 'Seeded historical session and logs', session });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get replay data for a session
router.get('/sessions/:id/replay', async (req, res) => {
  try {
    const data = await SessionRecordingService.getReplayData(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching replay data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export metrics report for a session
router.post('/sessions/:id/export', async (req, res) => {
  try {
    const data = await SessionRecordingService.getReplayData(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mission-replay-${req.params.id}.json`);
    res.json({
      exportedAt: new Date(),
      sessionId: req.params.id,
      missionSummary: {
        driver: data.session.driver?.name || 'Unknown',
        date: data.session.createdAt,
        mode: data.session.emergencyMode,
        severity: data.session.severity,
        efficiencyScore: data.analytics.averageEfficiency,
        reroutesEngaged: data.analytics.reroutesCount,
        totalResponseTimeSeconds: data.analytics.totalResponseTimeSec,
        delayPreventedSeconds: data.analytics.delayPreventedSec,
      },
      telemetry: data.session.telemetryLogs,
      events: data.session.eventLogs,
      reroutes: data.session.rerouteHistory,
      obstructions: data.session.obstructionReports,
    });
  } catch (error) {
    console.error('Error exporting session report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REST endpoint to report manual obstruction
router.post('/sessions/:id/obstruction', async (req, res) => {
  const { type, lat, lng, details } = req.body;
  try {
    const io = req.app.get('io'); // In case app has registered io
    await SessionRecordingService.triggerManualObstruction(
      req.params.id,
      type,
      Number(lat || 28.6160),
      Number(lng || 77.2140),
      details || null,
      io || { emit: () => {} }
    );
    res.json({ success: true, message: 'Obstruction report processed' });
  } catch (error) {
    console.error('Error reporting obstruction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
