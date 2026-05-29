import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get list of historical/completed hospital load runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await prisma.hospitalAllocationRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(runs);
  } catch (error) {
    console.error('Error fetching hospital allocation runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single run details + snapshots for scrubbing/replay
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await prisma.hospitalAllocationRun.findUnique({
      where: { id: req.params.id },
      include: {
        snapshots: { orderBy: { tick: 'asc' } }
      }
    });

    if (!run) {
      return res.status(404).json({ error: 'Hospital run not found.' });
    }

    res.json({
      run,
      snapshots: run.snapshots
    });
  } catch (error) {
    console.error('Error fetching hospital run detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare two hospital allocation runs
router.get('/compare', async (req, res) => {
  const { runAId, runBId } = req.query;
  if (!runAId || !runBId) {
    return res.status(400).json({ error: 'runAId and runBId query parameters are required.' });
  }

  try {
    const runA = await prisma.hospitalAllocationRun.findUnique({
      where: { id: String(runAId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });
    const runB = await prisma.hospitalAllocationRun.findUnique({
      where: { id: String(runBId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });

    if (!runA || !runB) {
      return res.status(404).json({ error: 'One or both hospital runs not found.' });
    }

    res.json({
      runA: {
        id: runA.id,
        createdAt: runA.createdAt,
        efficiencyScore: runA.efficiencyScore,
        averageIntakeTimeSec: runA.averageIntakeTimeSec,
        redirectsCount: runA.redirectsCount,
        status: runA.status,
        snapshotCount: runA.snapshots.length
      },
      runB: {
        id: runB.id,
        createdAt: runB.createdAt,
        efficiencyScore: runB.efficiencyScore,
        averageIntakeTimeSec: runB.averageIntakeTimeSec,
        redirectsCount: runB.redirectsCount,
        status: runB.status,
        snapshotCount: runB.snapshots.length
      }
    });
  } catch (error) {
    console.error('Error comparing hospital runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
