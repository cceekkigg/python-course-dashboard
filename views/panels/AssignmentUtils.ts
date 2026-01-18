// ==============================================================================
// FILE PATH: views/panels/AssignmentUtils.ts
// ==============================================================================

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
// Using 0.25.0 to ensure compatibility with modern packages
const PYODIDE_VERSION = "0.25.0";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const INPUT_OVERRIDE_CODE = `
import sys
import js

# Custom Input Handler using Browser Prompt
def input(prompt=""):
    val = js.prompt(prompt)
    if val is None:
        return ""
    print(f"{prompt}{val}")
    return str(val)

sys.modules['builtins'].input = input
`;

// --- CONFIGURATION: Day-specific Package Requirements ---
/**
 * Returns the list of 3rd-party Python packages required for a specific course day.
 * NOTE: dayIndex is 0-based (e.g., Day 1 is index 0).
 */
export const getRequiredPackages = (dayIndex: number): string[] => {
  // Day 9 (Index 8): Data Science Intro
  if (dayIndex === 8) {
    return ['numpy', 'pandas'];
  }
  // Day 10 (Index 9): Visualization
  if (dayIndex === 9) {
    return ['numpy', 'pandas', 'matplotlib'];
  }

  // Default: No extra packages (Standard Library only)
  return [];
};

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
    const x = window.sessionStorage;
  } catch (e) {
    try {
        Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true, writable: true });
        Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    } catch (err) {
        console.warn("Could not patch storage:", err);
    }
  }
};

// --- HOOK ---
export const usePyodide = (requiredPackages: string[] = []) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pyodide, setPyodide] = useState<any>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    // If we have packages, we might need to re-verify loading even if initRef is true
    // But for this simple implementation, we rely on the component mounting lifecycle.

    const loadEngine = async () => {
      try {
        applyStoragePatch();

        // 1. Check Global Instance
        let py = (window as any).pyodide;

        // 2. Load Script if missing
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

        // 3. Initialize Engine if not ready
        if (!py) {
            // Wait for loadPyodide to be available on window
            if ((window as any).loadPyodide) {
                py = await (window as any).loadPyodide({
                    indexURL: PYODIDE_BASE_URL,
                    stdout: (msg: string) => console.log("[Python]", msg),
                    stderr: (msg: string) => console.error("[Python]", msg)
                });
                (window as any).pyodide = py; // Cache globally
            }
        }

        // 4. Load Required Packages
        if (py && requiredPackages.length > 0) {
            // 'micropip' is the package manager for Pyodide
            await py.loadPackage("micropip");
            // Load the requested 3rd party libraries
            // Pyodide handles caching, so calling this multiple times is safe/fast
            await py.loadPackage(requiredPackages);
        }

        setPyodide(py);
        setIsReady(true);

      } catch (err: any) {
        console.error("Pyodide Init Failed:", err);
        setError(err.message);
      }
    };

    loadEngine();
  }, [requiredPackages.join(',')]); // Re-run if the package list requirements change

  return { isReady, pyodide, error };
};