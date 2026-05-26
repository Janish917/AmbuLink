import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import emergencyRoutes from './routes/emergency';
import { EmergencySessionService } from './services/EmergencySessionService';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/emergency', emergencyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'SAPS Backend is running' });
});

// Socket.io for Realtime Tracking
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start_emergency', async (data) => {
    console.log('Emergency started:', data);
    
    // Create actual session using V3 probabilistic engine
    // dummy coordinates for new delhi
    const start: [number, number] = [28.6139, 77.2090];
    const end: [number, number] = [28.6250, 77.2250];
    
    try {
      const result = await EmergencySessionService.activateEmergency(
        'dummy-driver-id', 
        start, 
        end, 
        4 // severity
      );

      // Broadcast the V3 payload to traffic control and police
      io.emit('emergency_alert', {
        ...data,
        simulation: result.simulationData,
        humanDelay: result.humanResponseProfile,
        timeline: result.timeline
      });
    } catch(err) {
      console.error(err);
      // Fallback emit if db fails for some reason
      io.emit('emergency_alert', data);
    }
  });

  socket.on('location_update', (data) => {
    // data should contain { sessionId, lat, lng, etaMins }
    io.emit('location_update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
