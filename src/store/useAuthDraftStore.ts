// src/store/useAuthDraftStore.ts
import { create } from 'zustand';

interface AuthDraft {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  isPhoneVerified: boolean;
  setField: (field: keyof Omit<AuthDraft, 'setField' | 'reset'>, value: string | boolean) => void;
  reset: () => void;
}

const initialState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  isPhoneVerified: false,
};

export const useAuthDraftStore = create<AuthDraft>((set) => ({
  ...initialState,
  setField: (field, value) => set({ [field]: value }),
  reset: () => set(initialState),
}));