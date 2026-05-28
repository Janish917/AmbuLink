import axios from 'axios';
import * as turf from '@turf/turf';
import polyline from '@mapbox/polyline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RoutingService {
  /**
   * Generates a real route using Mapbox (or mocks if token is dummy)
   */
  static async getRoute(start: [number, number], end: [number, number]) {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    let coords: [number, number][] = [];
    let duration = 0;
    let encodedPolyline = '';

    try {
      if (!token || token.includes('dummy')) {
        throw new Error('Using dummy token, fallback to mock route');
      }
      
      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=polyline&overview=full&access_token=${token}`
      );
      
      encodedPolyline = res.data.routes[0].geometry;
      duration = res.data.routes[0].duration; // in seconds
      coords = polyline.decode(encodedPolyline); // returns [lat, lng]
    } catch (e) {
      // Mock route for demo purposes if Mapbox fails
      console.log('Falling back to simulated intelligent route generation.');
      coords = [
        start,
        [start[0] + 0.005, start[1] + 0.005],
        [start[0] + 0.010, start[1] + 0.010],
        end
      ];
      encodedPolyline = polyline.encode(coords);
      duration = 600; // 10 mins
    }

    return {
      polyline: encodedPolyline,
      coordinates: coords, // Array of [lat, lng]
      etaMins: Math.ceil(duration / 60)
    };
  }

  /**
   * Uses Turf.js to create a 500m buffer around the route and finds all authorities inside it
   */
  static async findRelevantAuthoritiesAlongRoute(routeCoords: [number, number][], maxRadiusMeters: number = 1500) {
    // routeCoords are [lat, lng]. Turf expects [lng, lat].
    const lineString = turf.lineString(routeCoords.map(c => [c[1], c[0]]));
    
    // Create a dynamic buffer polygon in kilometers
    const radiusKm = maxRadiusMeters / 1000.0;
    const routeBuffer = turf.buffer(lineString, radiusKm, { units: 'kilometers' });

    // Fetch all authorities (in a real app, query by bounding box first)
    const authorities = await prisma.user.findMany({
      where: {
        role: { in: ['POLICE', 'TRAFFIC_OP', 'SYSTEM_NODE', 'HOSPITAL'] },
        lat: { not: null },
        lng: { not: null }
      }
    });

    const relevantNodes = [];

    for (const auth of authorities) {
      const point = turf.point([auth.lng!, auth.lat!]);
      
      // Check if authority is inside the dynamic corridor
      if (routeBuffer && turf.booleanPointInPolygon(point, routeBuffer as any)) {
        // Calculate nearest point on the route to estimate ETA
        const nearestPoint = turf.nearestPointOnLine(lineString, point);
        
        // Simple heuristic for ETA: distance along the line
        const distanceAlongRoute = nearestPoint.properties.location; // distance from start in km
        const totalDistance = turf.length(lineString, { units: 'kilometers' });
        const etaFraction = totalDistance > 0 ? (distanceAlongRoute / totalDistance) : 0;

        relevantNodes.push({
          authorityId: auth.id,
          role: auth.role,
          name: auth.name,
          distanceFromRoute: nearestPoint.properties.dist * 1000, // meters
          etaFraction // Multiply this by total ETA to get ETA to this node
        });
      }
    }

    return relevantNodes;
  }
}
