// src/types/trip.ts
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationPoint {
  name: string;
  address?: string;
  location: GeoPoint;
  isFromSearch?: boolean;
}

export interface Stopover extends LocationPoint {
  id: string;
  order: number;
}

export interface Trip {
  id: string;
  shareCode: string;
  title: string;
  description?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt: any;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  scheduledAt: any | null;
  startTime?: string;                 // "09:30 AM"
  meetingPoint: LocationPoint;        // Start/Meeting Point
  startPoint: LocationPoint;          // same as meetingPoint in your design
  endPoint: LocationPoint;            // Destination
  stopovers: Stopover[];
  members: string[];
  memberCount: number;
  maxMembers: number;
  isPublic: boolean;
  inviteLink?: string;
  strayThreshold?: number; // in meters, optional
  routeGeometry?: any; // GeoJSON LineString, optional
}