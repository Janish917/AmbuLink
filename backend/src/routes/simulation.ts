import express from 'express';
import { PrismaClient } from '@prisma/client';
import { ResponseAnalyticsService } from '../services/ResponseAnalyticsService';

const router = express.Router();
const prisma = new PrismaClient();

// Get list of historical/completed simulation runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await prisma.simulationRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(runs);
  } catch (error) {
    console.error('Error fetching simulation runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get currently active run if any
router.get('/active', async (req, res) => {
  try {
    const activeRun = await prisma.simulationRun.findFirst({
      where: { status: 'RUNNING' },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });
    res.json(activeRun);
  } catch (error) {
    console.error('Error fetching active simulation run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single simulation run details + snapshots for scrubbing/replay
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await prisma.simulationRun.findUnique({
      where: { id: req.params.id },
      include: {
        snapshots: { orderBy: { tick: 'asc' } }
      }
    });

    if (!run) {
      return res.status(404).json({ error: 'Simulation run not found.' });
    }

    // Build the analytics report
    const analytics = ResponseAnalyticsService.generateReport(
      run.snapshots,
      run.intensity,
      run.aiAggression
    );

    res.json({
      run,
      analytics
    });
  } catch (error) {
    console.error('Error fetching simulation run detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare two simulation runs
router.get('/compare', async (req, res) => {
  const { runAId, runBId } = req.query;
  if (!runAId || !runBId) {
    return res.status(400).json({ error: 'runAId and runBId query parameters are required.' });
  }

  try {
    const runA = await prisma.simulationRun.findUnique({
      where: { id: String(runAId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });
    const runB = await prisma.simulationRun.findUnique({
      where: { id: String(runBId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });

    if (!runA || !runB) {
      return res.status(404).json({ error: 'One or both simulation runs not found.' });
    }

    const reportA = ResponseAnalyticsService.generateReport(runA.snapshots, runA.intensity, runA.aiAggression);
    const reportB = ResponseAnalyticsService.generateReport(runB.snapshots, runB.intensity, runB.aiAggression);

    res.json({
      runA: {
        id: runA.id,
        scenarioName: runA.scenarioName,
        intensity: runA.intensity,
        ambulanceCount: runA.ambulanceCount,
        aiAggression: runA.aiAggression,
        createdAt: runA.createdAt,
        metrics: reportA
      },
      runB: {
        id: runB.id,
        scenarioName: runB.scenarioName,
        intensity: runB.intensity,
        ambulanceCount: runB.ambulanceCount,
        aiAggression: runB.aiAggression,
        createdAt: runB.createdAt,
        metrics: reportB
      }
    });
  } catch (error) {
    console.error('Error comparing runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
