// src/store/useMapStore.ts
import { create } from 'zustand';

export const MAP_STYLES = [
  { name: 'Default', url: 'mapbox://styles/mapbox/streets-v12', previewId: 'streets-v12' },
  { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', previewId: 'satellite-streets-v12' },
  { name: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12', previewId: 'outdoors-v12' },
];

interface MapState {
  styleIndex: number;
  setStyleIndex: (index: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  styleIndex: 0, // Starts with Default
  setStyleIndex: (index) => set({ styleIndex: index }),
}));