import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get list of historical/completed compliance runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await prisma.complianceRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(runs);
  } catch (error) {
    console.error('Error fetching compliance runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get currently active run if any
router.get('/active', async (req, res) => {
  try {
    const activeRun = await prisma.complianceRun.findFirst({
      where: { status: 'ACTIVE' },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });
    res.json(activeRun);
  } catch (error) {
    console.error('Error fetching active compliance run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single compliance run details + snapshots for scrubbing/replay
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await prisma.complianceRun.findUnique({
      where: { id: req.params.id },
      include: {
        snapshots: { orderBy: { tick: 'asc' } }
      }
    });

    if (!run) {
      return res.status(404).json({ error: 'Compliance run not found.' });
    }

    res.json({
      run,
      snapshots: run.snapshots
    });
  } catch (error) {
    console.error('Error fetching compliance run detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare two compliance runs
router.get('/compare', async (req, res) => {
  const { runAId, runBId } = req.query;
  if (!runAId || !runBId) {
    return res.status(400).json({ error: 'runAId and runBId query parameters are required.' });
  }

  try {
    const runA = await prisma.complianceRun.findUnique({
      where: { id: String(runAId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });
    const runB = await prisma.complianceRun.findUnique({
      where: { id: String(runBId) },
      include: { snapshots: { orderBy: { tick: 'asc' } } }
    });

    if (!runA || !runB) {
      return res.status(404).json({ error: 'One or both compliance runs not found.' });
    }

    res.json({
      runA: {
        id: runA.id,
        createdAt: runA.createdAt,
        cityComplianceIndex: runA.cityComplianceIndex,
        cooperationIndex: runA.cooperationIndex,
        delayProbability: runA.delayProbability,
        mobilityRating: runA.mobilityRating,
        status: runA.status,
        snapshotCount: runA.snapshots.length
      },
      runB: {
        id: runB.id,
        createdAt: runB.createdAt,
        cityComplianceIndex: runB.cityComplianceIndex,
        cooperationIndex: runB.cooperationIndex,
        delayProbability: runB.delayProbability,
        mobilityRating: runB.mobilityRating,
        status: runB.status,
        snapshotCount: runB.snapshots.length
      }
    });
  } catch (error) {
    console.error('Error comparing compliance runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
