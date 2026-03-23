import { create } from 'zustand';

export type PatchType = 'inlet' | 'outlet' | 'wall' | 'symmetry' | 'empty';

export interface Patch {
  name: string;
  type: PatchType;
  faces: number[];
  color: string;
}

export interface DomainState {
  // UI Interaction
  wireframe: boolean;
  setWireframe: (wireframe: boolean) => void;
  selectedFace: number | null;
  setSelectedFace: (face: number | null) => void;

  // Domain Parameters
  shape: 'box' | 'cylinder';
  dimensions: [number, number, number]; // [x, y, z] or [r, h, 0]

  // Boundary Definitions
  patches: Record<string, Patch>;

  // Target Object (for subtraction)
  targetObject: {
    isLoaded: boolean;
    buffer: ArrayBuffer | null;
    position: [number, number, number];
  };

  // Fluid Void resulting manifold reference (stored as any or Manifold to avoid strictly exposing WASM types to components if needed)
  manifoldResult: unknown | null;
  setManifoldResult: (manifold: unknown | null) => void;

  // Diagnostic Status
  diagnostics: {
    isWatertight: boolean;
    hasDegenerateFaces: boolean;
    totalTriangles: number;
  };

  // Actions
  setShape: (shape: 'box' | 'cylinder') => void;
  setDimensions: (dimensions: [number, number, number]) => void;
  setPatch: (id: string, patch: Patch) => void;
  removePatch: (id: string) => void;
  setTargetObjectLoaded: (isLoaded: boolean) => void;
  setTargetObjectBuffer: (buffer: ArrayBuffer | null) => void;
  setTargetObjectPosition: (position: [number, number, number]) => void;
  setDiagnostics: (diagnostics: { isWatertight: boolean; hasDegenerateFaces: boolean; totalTriangles: number }) => void;
}

export const useStore = create<DomainState>((set) => ({
  wireframe: false,
  selectedFace: null,
  setWireframe: (wireframe) => set({ wireframe }),
  setSelectedFace: (selectedFace) => set({ selectedFace }),

  shape: 'box',
  dimensions: [10, 10, 10], // Default 10x10x10 box

  patches: {
    'default-wall': {
      name: 'walls',
      type: 'wall',
      faces: [],
      color: '#808080'
    }
  },

  targetObject: {
    isLoaded: false,
    buffer: null,
    position: [0, 0, 0],
  },

  manifoldResult: null,

  diagnostics: {
    isWatertight: true,
    hasDegenerateFaces: false,
    totalTriangles: 0,
  },

  setShape: (shape) => set({ shape }),
  setDimensions: (dimensions) => set({ dimensions }),
  setPatch: (id, patch) => set((state) => ({ patches: { ...state.patches, [id]: patch } })),
  removePatch: (id) => set((state) => {
    const newPatches = { ...state.patches };
    delete newPatches[id];
    return { patches: newPatches };
  }),
  setTargetObjectLoaded: (isLoaded) => set((state) => ({ targetObject: { ...state.targetObject, isLoaded } })),
  setTargetObjectBuffer: (buffer) => set((state) => ({ targetObject: { ...state.targetObject, buffer } })),
  setTargetObjectPosition: (position) => set((state) => ({ targetObject: { ...state.targetObject, position } })),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setManifoldResult: (manifoldResult) => set({ manifoldResult }),
}));
