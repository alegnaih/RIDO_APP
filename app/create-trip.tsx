// app/create-trip.tsx
import React from 'react';
import { useRouter } from 'expo-router';
import { CreateTripScreen } from '../src/components/trip/CreateTripScreen';

export default function CreateTripRoute() {
  const router = useRouter();
  
  // ✅ Pass the router.back() function to close the modal
  return <CreateTripScreen onClose={() => router.back()} />;
}