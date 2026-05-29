import express from 'express';
import { PrismaClient } from '@prisma/client';
import { FleetAnalyticsService } from '../services/FleetAnalyticsService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all completed fleet runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await prisma.fleetCoordinationRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(runs);
  } catch (error) {
    console.error('Error fetching fleet runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific run details + logs for scrubbing
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await prisma.fleetCoordinationRun.findUnique({
      where: { id: req.params.id },
      include: {
        logs: { orderBy: { tick: 'asc' } }
      }
    });

    if (!run) {
      return res.status(404).json({ error: 'Fleet coordination run not found.' });
    }

    const report = FleetAnalyticsService.generateReport(
      run.logs,
      run.ambulanceCount,
      run.averageDelay,
      run.rerouteCount,
      run.corridorUtilization
    );

    res.json({
      run,
      analytics: report
    });
  } catch (error) {
    console.error('Error fetching run detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare two fleet coordination runs
router.get('/compare', async (req, res) => {
  const { runAId, runBId } = req.query;
  if (!runAId || !runBId) {
    return res.status(400).json({ error: 'runAId and runBId are required query parameters.' });
  }

  try {
    const runA = await prisma.fleetCoordinationRun.findUnique({
      where: { id: String(runAId) },
      include: { logs: { orderBy: { tick: 'asc' } } }
    });
    const runB = await prisma.fleetCoordinationRun.findUnique({
      where: { id: String(runBId) },
      include: { logs: { orderBy: { tick: 'asc' } } }
    });

    if (!runA || !runB) {
      return res.status(404).json({ error: 'One or both coordination runs not found.' });
    }

    const reportA = FleetAnalyticsService.generateReport(runA.logs, runA.ambulanceCount, runA.averageDelay, runA.rerouteCount, runA.corridorUtilization);
    const reportB = FleetAnalyticsService.generateReport(runB.logs, runB.ambulanceCount, runB.averageDelay, runB.rerouteCount, runB.corridorUtilization);

    res.json({
      runA: {
        id: runA.id,
        ambulanceCount: runA.ambulanceCount,
        createdAt: runA.createdAt,
        metrics: reportA
      },
      runB: {
        id: runB.id,
        ambulanceCount: runB.ambulanceCount,
        createdAt: runB.createdAt,
        metrics: reportB
      }
    });
  } catch (error) {
    console.error('Error comparing fleet runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
