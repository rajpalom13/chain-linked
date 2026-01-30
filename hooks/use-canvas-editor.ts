/**
 * Canvas Editor State Management Hook
 * Manages slides, elements, selection, history, and template application
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type {
  CanvasSlide,
  CanvasElement,
  CanvasTemplate,
  CanvasEditorState,
  CanvasEditorAction,
  HistoryEntry,
  ElementType,
  CanvasTextElement,
  CanvasShapeElement,
  CANVAS_DIMENSIONS,
  MAX_SLIDES,
} from '@/types/canvas-editor';

const STORAGE_KEY = 'chainlinked-carousel-draft';
const MAX_HISTORY = 50;

/**
 * Generate a unique ID for elements and slides
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default empty slide
 */
function createDefaultSlide(): CanvasSlide {
  return {
    id: generateId(),
    elements: [],
    backgroundColor: '#ffffff',
  };
}

/**
 * Create a default text element
 */
function createDefaultTextElement(x = 100, y = 100): CanvasTextElement {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 400,
    height: 60,
    rotation: 0,
    text: 'Double-click to edit',
    fontSize: 32,
    fontFamily: 'Inter',
    fontWeight: 'normal',
    fill: '#000000',
    align: 'left',
  };
}

/**
 * Create a default shape element
 */
function createDefaultShapeElement(x = 100, y = 100): CanvasShapeElement {
  return {
    id: generateId(),
    type: 'shape',
    x,
    y,
    width: 200,
    height: 200,
    rotation: 0,
    shapeType: 'rect',
    fill: '#3b82f6',
    stroke: undefined,
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

/**
 * Initial state for the editor
 */
const initialState: CanvasEditorState = {
  slides: [createDefaultSlide()],
  currentSlideIndex: 0,
  selectedElementId: null,
  template: null,
  zoom: 1,
  showGrid: false,
  isExporting: false,
};

/**
 * Reducer for canvas editor state management
 */
function canvasEditorReducer(
  state: CanvasEditorState,
  action: CanvasEditorAction
): CanvasEditorState {
  switch (action.type) {
    case 'SET_SLIDES':
      return { ...state, slides: action.payload };

    case 'SET_CURRENT_SLIDE':
      return {
        ...state,
        currentSlideIndex: action.payload,
        selectedElementId: null,
      };

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload };

    case 'UPDATE_ELEMENT': {
      const { slideIndex, elementId, updates } = action.payload;
      const newSlides = [...state.slides];
      const slide = { ...newSlides[slideIndex] };
      slide.elements = slide.elements.map((el): CanvasElement =>
        el.id === elementId ? ({ ...el, ...updates } as CanvasElement) : el
      );
      newSlides[slideIndex] = slide;
      return { ...state, slides: newSlides };
    }

    case 'ADD_ELEMENT': {
      const { slideIndex, element } = action.payload;
      const newSlides = [...state.slides];
      const slide = { ...newSlides[slideIndex] };
      slide.elements = [...slide.elements, element];
      newSlides[slideIndex] = slide;
      return { ...state, slides: newSlides, selectedElementId: element.id };
    }

    case 'DELETE_ELEMENT': {
      const { slideIndex, elementId } = action.payload;
      const newSlides = [...state.slides];
      const slide = { ...newSlides[slideIndex] };
      slide.elements = slide.elements.filter((el) => el.id !== elementId);
      newSlides[slideIndex] = slide;
      return {
        ...state,
        slides: newSlides,
        selectedElementId:
          state.selectedElementId === elementId ? null : state.selectedElementId,
      };
    }

    case 'ADD_SLIDE': {
      if (state.slides.length >= 10) return state;
      const newSlide = action.payload || createDefaultSlide();
      const newSlides = [...state.slides, newSlide];
      return {
        ...state,
        slides: newSlides,
        currentSlideIndex: newSlides.length - 1,
        selectedElementId: null,
      };
    }

    case 'DELETE_SLIDE': {
      if (state.slides.length <= 1) return state;
      const newSlides = state.slides.filter((_, i) => i !== action.payload);
      const newIndex = Math.min(state.currentSlideIndex, newSlides.length - 1);
      return {
        ...state,
        slides: newSlides,
        currentSlideIndex: newIndex,
        selectedElementId: null,
      };
    }

    case 'DUPLICATE_SLIDE': {
      if (state.slides.length >= 10) return state;
      const slideToCopy = state.slides[action.payload];
      const duplicatedSlide: CanvasSlide = {
        ...JSON.parse(JSON.stringify(slideToCopy)),
        id: generateId(),
        elements: slideToCopy.elements.map((el) => ({
          ...JSON.parse(JSON.stringify(el)),
          id: generateId(),
        })),
      };
      const newSlides = [
        ...state.slides.slice(0, action.payload + 1),
        duplicatedSlide,
        ...state.slides.slice(action.payload + 1),
      ];
      return {
        ...state,
        slides: newSlides,
        currentSlideIndex: action.payload + 1,
        selectedElementId: null,
      };
    }

    case 'REORDER_SLIDES': {
      const { fromIndex, toIndex } = action.payload;
      const newSlides = [...state.slides];
      const [removed] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, removed);
      return {
        ...state,
        slides: newSlides,
        currentSlideIndex: toIndex,
      };
    }

    case 'UPDATE_SLIDE_BACKGROUND': {
      const { slideIndex, color } = action.payload;
      const newSlides = [...state.slides];
      newSlides[slideIndex] = { ...newSlides[slideIndex], backgroundColor: color };
      return { ...state, slides: newSlides };
    }

    case 'APPLY_TEMPLATE':
      return {
        ...state,
        slides: action.payload.defaultSlides.map((slide) => ({
          ...JSON.parse(JSON.stringify(slide)),
          id: generateId(),
          elements: slide.elements.map((el) => ({
            ...JSON.parse(JSON.stringify(el)),
            id: generateId(),
          })),
        })),
        template: action.payload,
        currentSlideIndex: 0,
        selectedElementId: null,
      };

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };

    default:
      return state;
  }
}

/**
 * Custom hook for managing canvas editor state
 * @returns Editor state and action methods
 */
export function useCanvasEditor() {
  const [state, dispatch] = useReducer(canvasEditorReducer, initialState);

  // History for undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  /**
   * Save current state to history
   */
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const entry: HistoryEntry = {
      slides: JSON.parse(JSON.stringify(state.slides)),
      currentSlideIndex: state.currentSlideIndex,
      selectedElementId: state.selectedElementId,
    };

    // Remove any future history if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Add new entry
    historyRef.current.push(entry);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, [state.slides, state.currentSlideIndex, state.selectedElementId]);

  /**
   * Auto-save to localStorage
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.slides));
      } catch (e) {
        console.warn('Failed to save carousel draft to localStorage');
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [state.slides]);

  /**
   * Load from localStorage on mount
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const slides = JSON.parse(saved) as CanvasSlide[];
        if (Array.isArray(slides) && slides.length > 0) {
          dispatch({ type: 'SET_SLIDES', payload: slides });
        }
      }
    } catch (e) {
      console.warn('Failed to load carousel draft from localStorage');
    }
  }, []);

  // ============ Slide Actions ============

  /**
   * Replace all slides with new slides
   * @param slides - New slides to set
   */
  const setSlides = useCallback((newSlides: CanvasSlide[]) => {
    saveToHistory();
    dispatch({ type: 'SET_SLIDES', payload: newSlides });
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: 0 });
    dispatch({ type: 'SELECT_ELEMENT', payload: null });
  }, [saveToHistory]);

  const setCurrentSlide = useCallback((index: number) => {
    saveToHistory();
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: index });
  }, [saveToHistory]);

  const addSlide = useCallback((slide?: CanvasSlide) => {
    saveToHistory();
    dispatch({ type: 'ADD_SLIDE', payload: slide });
  }, [saveToHistory]);

  const deleteSlide = useCallback((index: number) => {
    saveToHistory();
    dispatch({ type: 'DELETE_SLIDE', payload: index });
  }, [saveToHistory]);

  const duplicateSlide = useCallback((index: number) => {
    saveToHistory();
    dispatch({ type: 'DUPLICATE_SLIDE', payload: index });
  }, [saveToHistory]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    saveToHistory();
    dispatch({ type: 'REORDER_SLIDES', payload: { fromIndex, toIndex } });
  }, [saveToHistory]);

  const updateSlideBackground = useCallback((slideIndex: number, color: string) => {
    saveToHistory();
    dispatch({ type: 'UPDATE_SLIDE_BACKGROUND', payload: { slideIndex, color } });
  }, [saveToHistory]);

  // ============ Element Actions ============

  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: id });
  }, []);

  const updateElement = useCallback(
    (elementId: string, updates: Partial<CanvasElement>) => {
      saveToHistory();
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: { slideIndex: state.currentSlideIndex, elementId, updates },
      });
    },
    [state.currentSlideIndex, saveToHistory]
  );

  const addElement = useCallback(
    (type: ElementType) => {
      saveToHistory();
      let element: CanvasElement;
      const centerX = 540 - 200; // Center of 1080px canvas
      const centerY = 540 - 30;

      if (type === 'text') {
        element = createDefaultTextElement(centerX, centerY);
      } else if (type === 'shape') {
        element = createDefaultShapeElement(centerX - 100, centerY - 70);
      } else {
        // For image type, create a placeholder
        element = {
          id: generateId(),
          type: 'image',
          x: centerX - 100,
          y: centerY - 100,
          width: 400,
          height: 400,
          rotation: 0,
          src: '',
          alt: 'Image',
        };
      }

      dispatch({
        type: 'ADD_ELEMENT',
        payload: { slideIndex: state.currentSlideIndex, element },
      });
    },
    [state.currentSlideIndex, saveToHistory]
  );

  const deleteElement = useCallback(
    (elementId?: string) => {
      const idToDelete = elementId || state.selectedElementId;
      if (!idToDelete) return;

      saveToHistory();
      dispatch({
        type: 'DELETE_ELEMENT',
        payload: { slideIndex: state.currentSlideIndex, elementId: idToDelete },
      });
    },
    [state.currentSlideIndex, state.selectedElementId, saveToHistory]
  );

  // ============ Template Actions ============

  const applyTemplate = useCallback((template: CanvasTemplate) => {
    saveToHistory();
    dispatch({ type: 'APPLY_TEMPLATE', payload: template });
  }, [saveToHistory]);

  // ============ View Actions ============

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(0.25, Math.min(2, zoom)) });
  }, []);

  const toggleGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_GRID' });
  }, []);

  const setExporting = useCallback((isExporting: boolean) => {
    dispatch({ type: 'SET_EXPORTING', payload: isExporting });
  }, []);

  // ============ History Actions ============

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isUndoRedoRef.current = true;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'SET_SLIDES', payload: entry.slides });
      dispatch({ type: 'SET_CURRENT_SLIDE', payload: entry.currentSlideIndex });
      dispatch({ type: 'SELECT_ELEMENT', payload: entry.selectedElementId });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isUndoRedoRef.current = true;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: 'SET_SLIDES', payload: entry.slides });
      dispatch({ type: 'SET_CURRENT_SLIDE', payload: entry.currentSlideIndex });
      dispatch({ type: 'SELECT_ELEMENT', payload: entry.selectedElementId });
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // ============ Utility Actions ============

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear carousel draft');
    }
  }, []);

  const resetEditor = useCallback(() => {
    saveToHistory();
    dispatch({ type: 'SET_SLIDES', payload: [createDefaultSlide()] });
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: 0 });
    clearDraft();
  }, [saveToHistory, clearDraft]);

  // Get current slide
  const currentSlide = state.slides[state.currentSlideIndex];

  // Get selected element
  const selectedElement = currentSlide?.elements.find(
    (el) => el.id === state.selectedElementId
  ) || null;

  return {
    // State
    slides: state.slides,
    currentSlideIndex: state.currentSlideIndex,
    currentSlide,
    selectedElementId: state.selectedElementId,
    selectedElement,
    template: state.template,
    zoom: state.zoom,
    showGrid: state.showGrid,
    isExporting: state.isExporting,

    // Slide actions
    setSlides,
    setCurrentSlide,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    updateSlideBackground,

    // Element actions
    selectElement,
    updateElement,
    addElement,
    deleteElement,

    // Template actions
    applyTemplate,

    // View actions
    setZoom,
    toggleGrid,
    setExporting,

    // History actions
    undo,
    redo,
    canUndo,
    canRedo,

    // Utility actions
    clearDraft,
    resetEditor,
  };
}

export type UseCanvasEditorReturn = ReturnType<typeof useCanvasEditor>;
