import { useState, useEffect, useRef } from 'react';
import { AssignmentContent } from '../../types';

// --- TYPES ---
export interface AssignmentWithStatus extends AssignmentContent {
  user_status: 'in_progress' | 'submitted' | 'graded';
  user_score: number;
  is_locked: boolean;
  date: string;
}

export interface TestCase {
  inputs?: string[];
  input: string;
  expected: string;
  visible: boolean;
}

// --- CONSTANTS ---
// We lock to 0.24.1 to prevent LinkErrors and 404s on repodata.json
const PYODIDE_VERSION = "0.24.1";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const INPUT_OVERRIDE_CODE = `
import sys
import js

# Custom Input Handler
def input(prompt=""):
    if hasattr(sys, 'inputs') and len(sys.inputs) > 0:
        val = sys.inputs.pop(0)
        print(f"{prompt}{val}")
        return str(val)
    return ""

sys.modules['builtins'].input = input
sys.inputs = []
`;

// --- UTILS ---
export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Patch for SecurityError (Incognito/Strict Mode)
const applyStoragePatch = () => {
  const mockStorage = {
    length: 0,
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null
  };

  try {
    // Try accessing to see if it throws
    const x = window.sessionStorage;
  } catch (e) {
    // If access fails, define properties with the mock
    try {
        Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true, writable: true });
        Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    } catch (err) {
        console.warn("Could not patch storage:", err);
    }
  }
};

// --- HOOK ---
export const usePyodide = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pyodide, setPyodide] = useState<any>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const loadEngine = async () => {
      try {
        applyStoragePatch();

        // 1. Check Global
        if ((window as any).pyodide) {
          setPyodide((window as any).pyodide);
          setIsReady(true);
          return;
        }

        // 2. Load Script
        if (!document.getElementById('pyodide-script')) {
          const script = document.createElement('script');
          script.src = `${PYODIDE_BASE_URL}pyodide.js`;
          script.id = 'pyodide-script';
          script.async = true;

          await new Promise((resolve, reject) => {
             script.onload = resolve;
             script.onerror = () => reject(new Error("Failed to load Pyodide CDN"));
             document.body.appendChild(script);
          });
        }

        // 3. Initialize with Explicit URL
        if ((window as any).loadPyodide) {
          const py = await (window as any).loadPyodide({
             indexURL: PYODIDE_BASE_URL, // <--- CRITICAL FIX for LinkError/404
             stdout: (msg: string) => console.log("[Python]", msg),
             stderr: (msg: string) => console.error("[Python]", msg)
          });

          (window as any).pyodide = py; // Cache globally
          setPyodide(py);
          setIsReady(true);
        }

      } catch (err: any) {
        console.error("Pyodide Init Failed:", err);
        setError(err.message);
      }
    };

    loadEngine();
  }, []);

  return { isReady, pyodide, error };
};