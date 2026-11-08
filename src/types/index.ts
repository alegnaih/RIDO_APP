// ─── Auth Types ───────────────────────────────────────────────

export type UserRole = 'leader' | 'sweeper' | 'member';

export interface RiderProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  role: UserRole;
  isOnline: boolean;
  lastSeen: number;
}

// ─── Trip Types ───────────────────────────────────────────────

export type TripStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  plannedArrivalTime: number;
  notes?: string;
}

export interface Trip {
  id: string;
  code: string;
  name: string;
  leaderId: string;
  sweeperId?: string;
  waypoints: Waypoint[];
  status: TripStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  routeGeoJSON?: object;
}

export interface TripParticipant {
  uid: string;
  name: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: number;
  currentLocation?: GeoPoint;
  deviation?: {
    distanceMeters: number;
    isStray: boolean;
  };
}

// ─── Location Types ───────────────────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RiderLocation {
  uid: string;
  name: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  accuracy: number;
  timestamp: number;
}

// ─── SOS Types ────────────────────────────────────────────────

export interface EmergencyReport {
  tripId: string;
  riderId: string;
  riderName: string;
  latitude: number;
  longitude: number;
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  timestamp: number;
}

// ─── Checkpoint Types ─────────────────────────────────────────

export interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  plannedArrivalTime: number;
  weather?: {
    temp: number;
    condition: string;
    icon: string;
    windSpeed: number;
    rainProbability: number;
  };
}

export interface CheckIn {
  tripId: string;
  checkpointId: string;
  riderId: string;
  riderName: string;
  photoUri?: string;
  timestamp: number;
  latitude: number;
  longitude: number;
}

// ─── AI Assistant Types ───────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
