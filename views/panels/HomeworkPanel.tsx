// ==============================================================================
// FILE PATH: views/panels/HomeworkPanel.tsx
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { StudentRecord } from '../../types';
import Button from '../../components/Button';
import { ChevronLeft, Play, Terminal, Save, Loader2, Send, RotateCcw, FileText, Award, CheckSquare, Lock, AlertTriangle, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../data/supabaseClient';
import { usePyodide, AssignmentWithStatus } from './AssignmentUtils';

// --- 1. CUSTOM INPUT OVERRIDE ---
const CUSTOM_INPUT_CODE = `
import sys
import js

def input(prompt=""):
    msg = f"🐍 Python Input:\\n{prompt}"
    val = js.prompt(msg)
    if val is None:
        return ""
    print(f"{prompt}{val}")
    return str(val)

sys.modules['builtins'].input = input
`;

// --- MARKDOWN RENDERERS ---
const processInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-pink-600 font-mono text-xs border border-slate-200">{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
  });
};

const formatLine = (line: string, index: number) => {
  const trimmed = line.trim();
  if (!trimmed) return <div key={index} className="h-4" />;
  if (trimmed.startsWith('####')) return <h3 key={index} className="text-lg font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-2">{trimmed.replace(/####\s*/, '')}</h3>;
  if (trimmed.startsWith('###')) return <h4 key={index} className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">{trimmed.replace(/###\s*/, '')}</h4>;
  if (trimmed.startsWith('- ')) return <div key={index} className="flex gap-2 ml-2 mb-1 text-slate-700 text-sm"><span className="font-bold text-slate-400">•</span><span>{processInline(trimmed.substring(2))}</span></div>;
  if (line.startsWith('    ') || line.startsWith('\t') || line.startsWith('  ')) return <div key={index} className="ml-4 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-xs text-slate-600 w-fit mb-1">{trimmed}</div>;
  return <div key={index} className="text-slate-700 leading-relaxed mb-1 text-sm">{processInline(trimmed)}</div>;
};

const ManualMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const cleanContent = content
    .replace(/\[(HW|P).*?\]\(.*?\)/gi, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/\[(P|HW)\d+\]/g, '')
    .trim();
  return <div className="font-sans">{cleanContent.split('\n').map((line, idx) => formatLine(line, idx))}</div>;
};

// --- 2. SIMPLE CODE EDITOR ---
interface SimpleCodeEditorProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
}

const SimpleCodeEditor: React.FC<SimpleCodeEditorProps> = ({ value, onChange, disabled }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lines = value.split('\n');
    const lineCount = lines.length;
    const heightRows = Math.max(lineCount + 2, 3);
    const lineHeight = 24;
    const editorHeight = heightRows * lineHeight;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab' && !disabled) {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newValue = value.substring(0, start) + "    " + value.substring(end);
            onChange(newValue);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
            }, 0);
        }
    };

    return (
        <div className="flex bg-[#1e1e1e] overflow-hidden relative" style={{ height: `${editorHeight}px` }}>
            <div className="w-10 bg-slate-900 text-slate-500 text-right pr-2 pt-4 select-none font-mono text-sm leading-6 border-r border-slate-700 shrink-0">
                {lines.map((_, i) => ( <div key={i}>{i + 1}</div> ))}
            </div>
            <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-slate-100 font-mono text-sm leading-6 p-0 pl-3 pt-4 resize-none focus:outline-none whitespace-pre disabled:opacity-50"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                disabled={disabled}
            />
        </div>
    );
};

interface TestResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    visible: boolean;
}

interface GradingResult {
    score: number;
    maxPoints: number;
    tests: TestResult[];
}

interface HomeworkPanelProps {
  user: StudentRecord;
  assignment: AssignmentWithStatus;
  onBack: () => void;
  onComplete?: (id: string, score: number) => void;
}

export const HomeworkPanel: React.FC<HomeworkPanelProps> = ({ user, assignment, onBack, onComplete }) => {
  const { isReady, pyodide, error: pyodideError } = usePyodide();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [execStatus, setExecStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [consoleOutput, setConsoleOutput] = useState<Record<string, string>>({});

  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult>>({});
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // DEADLINE STATE
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isLate, setIsLate] = useState(false);

  // Helper to calculate totals for display
  const getTotalScore = () => finalScore !== null ? finalScore : Object.values(gradingResults).reduce((acc, r) => acc + r.score, 0);
  const getMaxScore = () => Object.values(gradingResults).reduce((acc, r) => acc + r.maxPoints, 0);

  useEffect(() => {
    const init = async () => {
      // 1. Fetch Course Start Date to calculate DDL
      try {
          const { data: settings } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'course_start_date')
              .single();

          if (settings && settings.value) {
              const startDate = new Date(settings.value);
              const dayIndex = assignment.day_index || 0;

              // Calculate "Calendar Days" considering Monday start
              const weeksPassed = Math.floor(dayIndex / 5);
              const dayOfWeek = dayIndex % 5; // 0=Mon, 4=Fri

              // Base release date (Mon-Fri logic only)
              const releaseDate = new Date(startDate);
              releaseDate.setDate(startDate.getDate() + (weeksPassed * 7) + dayOfWeek);

              // DDL Logic: Next Session @ 13:00
              const ddlDate = new Date(releaseDate);
              if (dayOfWeek === 4) {
                  // If Friday, due next Monday (+3 days)
                  ddlDate.setDate(releaseDate.getDate() + 3);
              } else {
                  // Else due next day (+1 day)
                  ddlDate.setDate(releaseDate.getDate() + 1);
              }

              // Set strict time to 13:00
              ddlDate.setHours(13, 0, 0, 0);

              setDeadline(ddlDate);
              setIsLate(new Date() > ddlDate);
          }
      } catch (e) {
          console.error("Error calculating deadline:", e);
      }

      // 2. Storage Shim
      try { const check = window.sessionStorage; } catch (e) {
        try {
            Object.defineProperty(window, 'sessionStorage', { value: { length: 0, getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null }, configurable: true, writable: true });
            Object.defineProperty(window, 'localStorage', { value: { length: 0, getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null }, configurable: true, writable: true });
        } catch (err) {}
      }

      // 3. Load Saved Data
      const defaultAnswers: Record<string, string> = {};
      if (assignment.questions) {
          assignment.questions.forEach(q => {
              if (q.type === 'code' && q.starter_code) {
                 defaultAnswers[q.id] = q.starter_code;
              }
          });
      }

      if (user.role !== 'guest') {
        const { data } = await supabase.from('user_assignment_progress')
             .select('saved_answers, validation_status, status, score')
             .match({ user_id: user.id, assignment_id: assignment.id })
             .maybeSingle();
        if (data) {
            setAnswers({ ...defaultAnswers, ...(data.saved_answers || {}) });

            if (data.status === 'submitted') {
                setIsSubmitted(true);
                setFinalScore(data.score);
                if (data.validation_status && typeof data.validation_status === 'object') {
                    const sampleKey = Object.keys(data.validation_status)[0];
                    if (sampleKey && data.validation_status[sampleKey].tests) {
                        setGradingResults(data.validation_status);
                    } else {
                        setExecStatus(data.validation_status);
                    }
                }
            } else {
                if (data.validation_status) setExecStatus(data.validation_status);
            }
        } else {
            setAnswers(defaultAnswers);
        }
      } else {
          setAnswers(defaultAnswers);
      }
    };

    init();
  }, [user.id, assignment.id, assignment.questions]);

  const handleRestart = async () => {
    if (!confirm("Restart Kernel? This will clear outputs and variables.")) return;
    setExecStatus({});
    setConsoleOutput({});
    if (pyodide && isReady) {
       try {
           await pyodide.runPythonAsync(`
            for name in list(globals().keys()):
                if not name.startswith("_") and name not in ['sys', 'js', 'input', 'io', 'pyodide']:
                    del globals()[name]
            `);
           await pyodide.runPythonAsync(CUSTOM_INPUT_CODE);
       } catch (e) {
           console.error("Soft reset failed:", e);
       }
    }
  };

  const handleSave = async (silent = false, gradingData: any = null, score = 0) => {
      try {
          setIsSaving(true);
          const payload: any = {
              user_id: user.id,
              assignment_id: assignment.id,
              score: score,
              saved_answers: answers,
              validation_status: gradingData || execStatus,
              submitted_at: new Date().toISOString()
          };

          if (gradingData) {
              payload.status = 'submitted';
          }

          const { error } = await supabase.from('user_assignment_progress').upsert(payload, { onConflict: 'user_id, assignment_id' });
          if (error) throw error;

          if (!silent) setSaveSuccess(true);
          if (gradingData && onComplete) {
              onComplete(assignment.id, score);
          }

      } catch (err: any) {
          console.error("Failed to save progress:", err);
          alert(`Failed to save: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  // --- AUTO-GRADING ENGINE ---
  const performGrading = async () => {
      setIsSaving(true);
      setShowConfirmModal(false);

      const results: Record<string, GradingResult> = {};
      let totalAssignmentScore = 0;
      let maxAssignmentScore = 0;

      await pyodide.runPythonAsync(CUSTOM_INPUT_CODE);

      for (const question of assignment.questions) {
          if (question.type !== 'code') continue;

          const maxPoints = question.points || 0;
          maxAssignmentScore += maxPoints;
          const userCode = answers[question.id] || "";
          const allTests = question.validation?.test_cases || [];

          // Variable Injection Parsing
          const delimiter = "# solution code below";
          let codeToExecute = userCode;
          let variables: string[] = [];

          if (userCode.includes(delimiter)) {
              const parts = userCode.split(delimiter);
              if (parts.length > 1) {
                  const userSetup = parts[0];
                  codeToExecute = parts[1];
                  const matches = [...userSetup.matchAll(/^\s*([a-zA-Z_]\w*)\s*=/gm)];
                  variables = matches.map(m => m[1]);
              }
          }

          const testResults: TestResult[] = [];
          let allPassed = true;

          if (allTests.length === 0) {
              allPassed = userCode.trim().length > 0;
          } else {
              for (const test of allTests) {
                  await pyodide.runPythonAsync(`for v in ['km', 'a', 'b', 'n', 'result', 'channel_A', 'channel_B', 'temp', 'meters', 'reversed_number', 'd1', 'd2', 'd3', 'd4']:
                      if v in globals(): del globals()[v]`);

                  const inputValues = test.input.split(',').map((s: string) => s.trim());
                  let injection = "";

                  if (variables.length > 0 && inputValues.length === variables.length) {
                      variables.forEach((v, idx) => {
                          injection += `${v} = ${inputValues[idx]}\n`;
                      });
                  } else if (variables.length === 1) {
                      injection = `${variables[0]} = ${test.input}\n`;
                  }

                  if (injection) {
                      try { await pyodide.runPythonAsync(injection); } catch(e) {}
                  } else {
                      try { await pyodide.runPythonAsync(test.input); } catch(e) {}
                  }

                  let captured = "";
                  let runError = false;
                  pyodide.setStdout({ batched: (msg: string) => captured += msg });

                  try {
                      await pyodide.runPythonAsync(codeToExecute);
                  } catch (e) {
                      captured = "Runtime Error";
                      runError = true;
                  }

                  const actual = captured.trim();
                  const expected = test.expected.toString().trim();

                  let passed = actual === expected;
                  if (!passed && !runError) {
                      const fActual = parseFloat(actual);
                      const fExpected = parseFloat(expected);
                      if (!isNaN(fActual) && !isNaN(fExpected)) passed = Math.abs(fActual - fExpected) < 0.01;
                  }

                  if (!passed) allPassed = false;

                  testResults.push({
                      input: test.input,
                      expected: expected,
                      actual: actual,
                      passed: passed,
                      visible: !!test.visible
                  });
              }
          }

          let earnedScore = allPassed ? maxPoints : 0;

          totalAssignmentScore += earnedScore;

          results[question.id] = {
              score: earnedScore,
              maxPoints: maxPoints,
              tests: testResults
          };

      }

      // LATE PENALTY LOGIC
      if (isLate && totalAssignmentScore > 0) {
        totalAssignmentScore = Math.ceil(totalAssignmentScore * 0.6); // 60% cap
      }

      setFinalScore(totalAssignmentScore);
      setGradingResults(results);
      setIsSubmitted(true);

      await handleSave(true, results, totalAssignmentScore);
  };

  const handleRunCode = async (questionId: string) => {
     if (!pyodide) return 0;
     setExecStatus(prev => ({ ...prev, [questionId]: 'running' }));
     setConsoleOutput(prev => ({ ...prev, [questionId]: `🚀 Starting Pre-check...\n` }));

     const userCode = answers[questionId] || "";
     const question = assignment.questions.find(q => q.id === questionId);
     if (!question) return 0;

     const allTests = question.validation?.test_cases || [];
     const testsToRun = allTests.filter(tc => tc.visible !== false);

     if (testsToRun.length === 0) {
         setConsoleOutput(prev => ({ ...prev, [questionId]: "⚠️ No visible test cases to check." }));
         setExecStatus(prev => ({ ...prev, [questionId]: 'success' }));
         return 1;
     }

     const delimiter = "# solution code below";
     let codeToExecute = userCode;
     let variables: string[] = [];
     let ignoredTop = false;

     if (userCode.includes(delimiter)) {
         const parts = userCode.split(delimiter);
         if (parts.length > 1) {
             const userSetup = parts[0];
             codeToExecute = parts[1];
             ignoredTop = true;
             const matches = [...userSetup.matchAll(/^\s*([a-zA-Z_]\w*)\s*=/gm)];
             variables = matches.map(m => m[1]);
         }
     }

     let passedCount = 0;
     let logBuffer = "";

     try {
         await pyodide.runPythonAsync(CUSTOM_INPUT_CODE || "sys_inputs = []");

         for (let i = 0; i < testsToRun.length; i++) {
             const test = testsToRun[i];
             await pyodide.runPythonAsync(`for v in ['km', 'a', 'b', 'n', 'result', 'channel_A', 'channel_B', 'temp', 'meters', 'reversed_number', 'd1', 'd2', 'd3', 'd4']:
                if v in globals(): del globals()[v]`);

             const inputValues = test.input.split(',').map((s: string) => s.trim());
             let injection = "";

             if (variables.length > 0 && inputValues.length === variables.length) {
                 variables.forEach((v, idx) => {
                     injection += `${v} = ${inputValues[idx]}\n`;
                 });
             } else if (variables.length === 1) {
                 injection = `${variables[0]} = ${test.input}\n`;
             }

             if (injection) {
                 await pyodide.runPythonAsync(injection);
             } else {
                 try { await pyodide.runPythonAsync(test.input); } catch (e) {}
             }

             let captured = "";
             pyodide.setStdout({ batched: (msg: string) => captured += msg });
             await pyodide.runPythonAsync(codeToExecute);

             const actual = captured.trim();
             const expected = test.expected.toString().trim();
             let isMatch = actual === expected;

             if (!isMatch) {
                 const fActual = parseFloat(actual);
                 const fExpected = parseFloat(expected);
                 if (!isNaN(fActual) && !isNaN(fExpected)) isMatch = Math.abs(fActual - fExpected) < 0.01;
             }

             const label = `Test #${i+1}`;

             if (isMatch) {
                 passedCount++;
                 logBuffer += `✅ [${label}] PASS\n   Input: ${test.input}\n   Output: ${actual}\n`;
             } else {
                 logBuffer += `❌ [${label}] FAIL\n   Input: ${test.input}\n   Expected: ${expected}\n   Got: ${actual}\n`;
                 if (!ignoredTop) logBuffer += `   ⚠️ Hint: ensure '${delimiter}' is present.\n`;
             }
         }

         setConsoleOutput(prev => ({ ...prev, [questionId]: logBuffer }));
         setExecStatus(prev => ({ ...prev, [questionId]: 'success' }));
         return passedCount / testsToRun.length;
     } catch (err: any) {
         setConsoleOutput(prev => ({ ...prev, [questionId]: `🔥 Runtime Error:\n${err.message}` }));
         setExecStatus(prev => ({ ...prev, [questionId]: 'error' }));
         return 0;
     }
  };

  if (pyodideError) return <div className="p-8 text-center text-red-600">{pyodideError}</div>;

  return (
    <div className="space-y-6 relative min-h-screen pb-20">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10 pt-2 px-4 shadow-sm">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
            <div>
               <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-purple-100 text-purple-700">Homework</span>
                  <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
               </div>
               {deadline && (
                   <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-mono">
                       <Clock className="w-3 h-3" />
                       Due: {deadline.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       {isLate && !isSubmitted && <span className="text-amber-700 font-bold ml-2">(LATE 60%)</span>}
                   </div>
               )}
            </div>
        </div>

        <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleRestart} title="Restart Kernel" className="text-slate-500 hover:text-red-600 hover:bg-red-50" disabled={isSubmitted}>
                <RotateCcw className="w-4 h-4" />
            </Button>

            <Button size="sm" variant="outline" onClick={() => handleSave(false)} disabled={isSaving || isSubmitted || user.role === 'guest'} className="text-slate-600 border-slate-300 hover:bg-slate-100">
                {isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                Save Draft
            </Button>

            {isSubmitted ? (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg border border-slate-200 font-bold text-sm select-none">
                    <CheckSquare className="w-4 h-4 text-green-600"/>
                    <span className="text-slate-900">Score: {getTotalScore()} / {getMaxScore()}</span>
                </div>
            ) : (
                <Button
                    size="sm"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSaving}
                    className={`transition-colors text-white ${isLate ? 'bg-amber-800 hover:bg-amber-900' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                    <Send className="w-3 h-3 mr-2" /> Submit Homework
                </Button>
            )}
        </div>
      </header>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                  <div className="p-6 text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isLate ? 'bg-amber-100' : 'bg-yellow-100'}`}>
                          <AlertTriangle className={`w-8 h-8 ${isLate ? 'text-amber-700' : 'text-yellow-600'}`} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                          {isLate ? "Late Submission Warning" : "Ready to Submit?"}
                      </h3>
                      <p className="text-slate-600 text-sm mb-6">
                          {isLate ? (
                              <>
                                  The deadline has passed. Your submission will be accepted, but the maximum possible score is capped at <strong>60%</strong>.
                              </>
                          ) : (
                              <>
                                  Once submitted, your answers will be <strong>auto-graded</strong> and cannot be changed.
                                  Please double-check your code.
                              </>
                          )}
                      </p>
                      <div className="flex gap-3 justify-center">
                          <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                          <Button onClick={performGrading} className={`${isLate ? 'bg-amber-800 hover:bg-amber-900' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                              {isLate ? 'Accept & Submit' : 'Yes, Grade It'}
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SUBMIT SUCCESS MODAL */}
      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center border-t-4 border-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{isSubmitted ? 'Homework Submitted!' : 'Draft Saved!'}</h3>
                <p className="text-sm text-slate-600 mb-6">{isSubmitted ? 'Your grades are now available below.' : 'Your answers have been saved.'}</p>
                <Button fullWidth onClick={() => setSaveSuccess(false)}>
                    Continue
                </Button>
            </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 px-4">
         {assignment.questions && assignment.questions.map((cell: any, idx: number) => {
            const result = gradingResults[cell.id];

            return (
            <React.Fragment key={cell.id}>
                {idx === 0 && (
                    <div className="flex items-center gap-4 py-6 mt-2">
                         <div className="flex items-center gap-2 text-purple-600 font-bold uppercase tracking-wider text-lg">
                             <FileText className="w-5 h-5" /> Questions
                         </div>
                         <div className="h-px bg-purple-200 flex-1"></div>
                    </div>
                )}

                <div className="flex gap-4 group transition-all rounded-xl p-4 bg-purple-50/30 border border-purple-100">
                    <div className="w-8 flex-shrink-0 pt-2 text-right">
                        <span className="font-mono text-xs font-bold text-purple-400">
                            Q{idx + 1}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm relative">
                            {cell.points && (
                                 <div className="absolute top-0 right-0 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                                    <Award className="w-3 h-3" /> {cell.points} {cell.points === 1 ? 'Pt' : 'Pts'}
                                </div>
                            )}
                            <ManualMarkdown content={cell.content || ""} />
                        </div>

                        {cell.type === 'code' && (
                            <div className={`rounded-xl border overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 ring-purple-500/20 ${execStatus[cell.id] === 'error' ? 'border-red-300' : execStatus[cell.id] === 'success' ? 'border-green-300' : 'border-slate-300'}`}>
                                <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center">
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-2"><Terminal className="w-3 h-3"/> Python 3.10</span>
                                     <button onClick={() => handleRunCode(cell.id)} disabled={!isReady || isSubmitted} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md text-white shadow-sm transition-colors ${isSubmitted ? 'bg-slate-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                        <Play className="w-3 h-3"/> Pre-check
                                     </button>
                                </div>

                                <SimpleCodeEditor
                                    value={answers[cell.id] || ""}
                                    onChange={(val) => setAnswers({...answers, [cell.id]: val})}
                                    disabled={isSubmitted}
                                />

                                {(consoleOutput[cell.id] && !isSubmitted) && (
                                    <div className="border-t border-slate-700 bg-[#1e1e1e] p-3">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Pre-check Output</div>
                                        <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{consoleOutput[cell.id]}</pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GRADING REPORT */}
                        {isSubmitted && result && (
                            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Grading Report</h4>
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${result.score > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        Score: {result.score} / {result.maxPoints}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-2 font-medium text-slate-500">Input</th>
                                                <th className="px-4 py-2 font-medium text-slate-500">Expected</th>
                                                <th className="px-4 py-2 font-medium text-slate-500">Actual</th>
                                                <th className="px-4 py-2 font-medium text-slate-500 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {result.tests.map((t, i) => (
                                                <tr key={i} className={t.passed ? 'bg-white' : 'bg-red-50/50'}>
                                                    <td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.input}</td>
                                                    <td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.expected}</td>
                                                    <td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.actual}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        {t.passed ?
                                                            <span className="inline-flex items-center text-green-600 font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Pass</span> :
                                                            <span className="inline-flex items-center text-red-600 font-bold"><XCircle className="w-3 h-3 mr-1"/> Fail</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </React.Fragment>
            );
         })}
      </div>
    </div>
  );
};