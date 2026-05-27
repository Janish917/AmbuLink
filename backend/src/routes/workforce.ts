import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Get all drivers registered under this hospital admin
router.get('/drivers', protect, async (req, res) => {
  try {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'HOSPITAL') {
      console.warn('[Workforce] Unauthorized request, not HOSPITAL role:', adminUser?.role);
      return res.status(403).json({ error: 'Forbidden: Only hospital administration can access workforce data' });
    }

    if (!adminUser.hospitalId) {
      console.warn('[Workforce] Admin user missing hospitalId association:', adminUser.id);
      return res.status(400).json({ error: 'Hospital ID not associated with this admin profile' });
    }

    console.log(`[Workforce] Fetching drivers for hospitalId: ${adminUser.hospitalId} by admin: ${adminUser.name}`);

    const drivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        registeredHospitalId: adminUser.hospitalId
      },
      select: {
        id: true,
        name: true,
        driverId: true,
        registeredHospitalId: true,
        phone: true,
        email: true,
        ambulanceNumber: true,
        verificationStatus: true,
        employmentStatus: true,
        shiftType: true,
        shiftStart: true,
        shiftEnd: true,
        joinedAt: true,
        resignedAt: true,
        lastLogin: true,
        emergencyCount: true
      },
      orderBy: { joinedAt: 'desc' }
    });

    console.log(`[Workforce] Successfully fetched ${drivers.length} drivers for hospitalId: ${adminUser.hospitalId}`);
    res.json(drivers);
  } catch (error) {
    console.error('[Workforce] Fetch workforce error:', error);
    res.status(500).json({ error: 'Failed to fetch workforce data' });
  }
});

// Update driver employment status
router.patch('/driver/:id/status', protect, async (req, res) => {
  try {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'HOSPITAL') {
      console.warn('[Workforce] Unauthorized status update attempt, not HOSPITAL:', adminUser?.role);
      return res.status(403).json({ error: 'Forbidden: Only hospital administration can access workforce data' });
    }

    if (!adminUser.hospitalId) {
      console.warn('[Workforce] Admin user missing hospitalId association:', adminUser.id);
      return res.status(400).json({ error: 'Hospital ID not associated with this admin profile' });
    }

    const id = req.params.id as string;
    const { status } = req.body; // 'active' | 'suspended' | 'resigned' | 'removed'

    console.log(`[Workforce] Status update request by admin ${adminUser.name} for driver ID: ${id} to status: ${status}`);

    if (!['active', 'suspended', 'resigned', 'removed'].includes(status)) {
      console.warn('[Workforce] Invalid employment status received:', status);
      return res.status(400).json({ error: 'Invalid employment status' });
    }

    const driver = await prisma.user.findFirst({
      where: { id, role: 'DRIVER', registeredHospitalId: adminUser.hospitalId }
    });

    if (!driver) {
      console.warn(`[Workforce] Driver not found or not associated with hospitalId ${adminUser.hospitalId}:`, id);
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const updateData: any = {
      employmentStatus: status,
      resignedAt: status === 'resigned' ? new Date() : null
    };

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: updateData
    });

    console.log(`[Workforce] Successfully updated driver ID: ${id} status to ${status}`);
    res.json({ message: 'Driver status updated successfully', driver: updatedDriver });
  } catch (error) {
    console.error('[Workforce] Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Update driver shift timings
router.patch('/driver/:id/shift', protect, async (req, res) => {
  try {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'HOSPITAL') {
      console.warn('[Workforce] Unauthorized shift update attempt, not HOSPITAL:', adminUser?.role);
      return res.status(403).json({ error: 'Forbidden: Only hospital administration can access workforce data' });
    }

    if (!adminUser.hospitalId) {
      console.warn('[Workforce] Admin user missing hospitalId association:', adminUser.id);
      return res.status(400).json({ error: 'Hospital ID not associated with this admin profile' });
    }

    const id = req.params.id as string;
    const { shiftType, shiftStart, shiftEnd } = req.body;

    console.log(`[Workforce] Shift update request by admin ${adminUser.name} for driver ID: ${id} to shift: ${shiftType} (${shiftStart} - ${shiftEnd})`);

    if (!shiftType || !shiftStart || !shiftEnd) {
      console.warn('[Workforce] Missing shift details in request body');
      return res.status(400).json({ error: 'Missing shift details' });
    }

    const driver = await prisma.user.findFirst({
      where: { id, role: 'DRIVER', registeredHospitalId: adminUser.hospitalId }
    });

    if (!driver) {
      console.warn(`[Workforce] Driver not found or not associated with hospitalId ${adminUser.hospitalId}:`, id);
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: {
        shiftType,
        shiftStart,
        shiftEnd
      }
    });

    console.log(`[Workforce] Successfully updated shift for driver ID: ${id}`);
    res.json({ message: 'Driver shift updated successfully', driver: updatedDriver });
  } catch (error) {
    console.error('[Workforce] Update driver shift error:', error);
    res.status(500).json({ error: 'Failed to update driver shift' });
  }
});

// Get currently active verified drivers on shift
router.get('/active', protect, async (req, res) => {
  try {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'HOSPITAL') {
      console.warn('[Workforce] Unauthorized active drivers request, not HOSPITAL:', adminUser?.role);
      return res.status(403).json({ error: 'Forbidden: Only hospital administration can access workforce data' });
    }

    if (!adminUser.hospitalId) {
      console.warn('[Workforce] Admin user missing hospitalId association:', adminUser.id);
      return res.status(400).json({ error: 'Hospital ID not associated with this admin profile' });
    }

    console.log(`[Workforce] Fetching active drivers for hospitalId: ${adminUser.hospitalId}`);

    const activeDrivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        registeredHospitalId: adminUser.hospitalId,
        employmentStatus: 'active',
        isVerified: true
      },
      select: {
        id: true,
        name: true,
        driverId: true,
        phone: true,
        ambulanceNumber: true,
        shiftType: true,
        shiftStart: true,
        shiftEnd: true,
        lastLogin: true
      }
    });

    console.log(`[Workforce] Successfully fetched ${activeDrivers.length} active drivers for hospitalId: ${adminUser.hospitalId}`);
    res.json(activeDrivers);
  } catch (error) {
    console.error('[Workforce] Fetch active drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch active drivers list' });
  }
});

export default router;
