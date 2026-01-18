import React, { useState, useEffect, useRef } from 'react';
import { StudentRecord } from '../../types';
import Button from '../../components/Button';
import { ChevronLeft, Play, Clock, Terminal, Eye, EyeOff, CheckCircle, Save, Loader2, BookOpen, Dumbbell, RotateCcw } from 'lucide-react';
import { supabase } from '../../data/supabaseClient';
import { usePyodide, formatTime, AssignmentWithStatus, INPUT_OVERRIDE_CODE } from './AssignmentUtils';

// --- MARKDOWN & EDITOR HELPERS ---
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
  const cleanContent = content.replace(/\[.*?\]\(.*?\)/g, '').replace(/\[P\d+\]/g, '').trim();
  return <div className="font-sans">{cleanContent.split('\n').map((line, idx) => formatLine(line, idx))}</div>;
};

const SimpleCodeEditor: React.FC<{value: string, onChange: (val: string) => void}> = ({ value, onChange }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lines = value.split('\n');
    const heightRows = Math.max(lines.length + 2, 3);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
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
        <div className="flex bg-[#1e1e1e] overflow-hidden relative" style={{ height: `${heightRows * 24}px` }}>
            <div className="w-10 bg-slate-900 text-slate-500 text-right pr-2 pt-4 select-none font-mono text-sm leading-6 border-r border-slate-700 shrink-0">
                {lines.map((_, i) => ( <div key={i}>{i + 1}</div> ))}
            </div>
            <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-slate-100 font-mono text-sm leading-6 p-0 pl-3 pt-4 resize-none focus:outline-none whitespace-pre"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
            />
        </div>
    );
};

// --- MAIN COMPONENT ---
interface ExercisePanelProps {
  user: StudentRecord;
  assignment: AssignmentWithStatus;
  onBack: () => void;
}

export const ExercisePanel: React.FC<ExercisePanelProps> = ({ user, assignment, onBack }) => {
  const dayIndex = assignment.day_index || 0;
  const dayNum = dayIndex;

  let requiredPkgs: string[] = [];
  if (dayNum === 9) requiredPkgs = ['numpy', 'pandas'];
  else if (dayNum === 10) requiredPkgs = ['numpy', 'pandas', 'matplotlib'];

  const { isReady, pyodide, error: pyodideError } = usePyodide(requiredPkgs);

  // State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [execStatus, setExecStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [consoleOutput, setConsoleOutput] = useState<Record<string, string>>({});
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});

  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const pTasks = assignment.questions.filter(q => q.type === 'code' && (q.id.startsWith('P') || /\[P\d+\]/.test(q.content)));
  const completionTarget = pTasks.length > 0 ? pTasks : assignment.questions.filter(q => q.type === 'code');
  const allTasksCompleted = completionTarget.length > 0 && completionTarget.every(q => execStatus[q.id] === 'success');

  // [FIX] Cleanup plots when leaving the page
  useEffect(() => {
    return () => {
        if ((window as any).document) {
            (window as any).document.pyodideMplTarget = null;
        }
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try { const m = { length:0, getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{}, key:()=>null };
            Object.defineProperty(window,'sessionStorage',{value:m,writable:true});
            Object.defineProperty(window,'localStorage',{value:m,writable:true});
      } catch(e){}

      const defaultAnswers: Record<string, string> = {};
      assignment.questions.forEach(q => {
          if (q.type === 'code' && q.starter_code) defaultAnswers[q.id] = q.starter_code;
      });

      if (user.role !== 'guest') {
        const { data } = await supabase.from('user_assignment_progress')
             .select('saved_answers, validation_status')
             .match({ user_id: user.id, assignment_id: assignment.id })
             .maybeSingle();
        if (data) {
            setAnswers({ ...defaultAnswers, ...(data.saved_answers || {}) });
            if (data.validation_status) setExecStatus(data.validation_status);
        } else {
            setAnswers(defaultAnswers);
        }
      } else {
          setAnswers(defaultAnswers);
      }
    };
    init();
  }, [user.id, assignment.id, assignment.questions]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasStarted) {
      timer = setInterval(() => setElapsedTime(p => p + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [hasStarted]);

  const handleStartTimer = () => setHasStarted(true);

  const handleRestart = async () => {
    if (!confirm("Restart Kernel?")) return;
    setExecStatus({});
    setConsoleOutput({});
    if (pyodide && isReady) {
       try {
           await pyodide.runPythonAsync(`
            for name in list(globals().keys()):
                if not name.startswith("_") and name not in ['sys', 'js', 'input', 'io', 'pyodide', 'numpy', 'pandas', 'matplotlib']:
                   del globals()[name]
           `);
           await pyodide.runPythonAsync(INPUT_OVERRIDE_CODE);
       } catch (e) { console.error(e); }
    }
  };

  const handleSave = async (silent = false, isSubmitting = false) => {
      try {
          setIsSaving(true);
          const payload: any = {
              user_id: user.id,
              assignment_id: assignment.id,
              score: 0,
              saved_answers: answers,
              validation_status: execStatus,
              submitted_at: new Date().toISOString()
          };
          if (isSubmitting) payload.status = 'submitted';
          const { error } = await supabase.from('user_assignment_progress').upsert(payload, { onConflict: 'user_id, assignment_id' });
          if (error) throw error;
          if (!silent) setSaveSuccess(true);
      } catch (err: any) {
          alert(`Failed to save: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleCompleteExercise = async () => {
      await handleSave(true, true);
      onBack();
  };

  const handleRunCode = async (cellId: string) => {
     if (!pyodide || !isReady) return;

     // 1. Update State (Triggers Render)
     setExecStatus(prev => ({ ...prev, [cellId]: 'running' }));
     setConsoleOutput(prev => ({ ...prev, [cellId]: 'Running...\n' }));

     // 2. [FIX] Wait for DOM update so the div exists
     await new Promise(resolve => setTimeout(resolve, 0));

     // 3. Set plot target
     if (dayNum === 10) {
        const plotDiv = document.getElementById(`plot-output-${cellId}`);
        if (plotDiv) {
            plotDiv.innerHTML = ""; // Clear old plots
            (window as any).document.pyodideMplTarget = plotDiv;
        }
     } else {
        (window as any).document.pyodideMplTarget = null;
     }

     const userCode = answers[cellId] || "";
     try {
         await pyodide.runPythonAsync(INPUT_OVERRIDE_CODE);
         let outputBuffer: string[] = [];
         pyodide.setStdout({ batched: (msg: string) => outputBuffer.push(msg) });
         await pyodide.runPythonAsync(userCode);

         setConsoleOutput(prev => ({ ...prev, [cellId]: outputBuffer.join('\n') }));
         setExecStatus(prev => ({ ...prev, [cellId]: 'success' }));
     } catch (err: any) {
         setConsoleOutput(prev => ({ ...prev, [cellId]: `Runtime Error: ${err.message}` }));
         setExecStatus(prev => ({ ...prev, [cellId]: 'error' }));
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
                  <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700">Exercise</span>
                  <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
               </div>
               <div className={`flex items-center gap-2 text-xs mt-1 font-mono text-slate-500`}>
                   <Clock className="w-3 h-3" /> {formatTime(elapsedTime)}
                   {requiredPkgs.length > 0 && <span className="ml-2 text-[10px] bg-orange-100 text-orange-800 px-1 rounded border border-orange-200">Pkg: {requiredPkgs.join(', ')}</span>}
               </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleRestart} title="Restart Kernel" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
               <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleSave(false)} disabled={isSaving || user.role === 'guest'} className="text-slate-600 border-slate-300 hover:bg-slate-100">
                {isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />} Save
            </Button>
            {hasStarted || allTasksCompleted ? (
                <Button
                    size="sm"
                    onClick={handleCompleteExercise}
                    disabled={!allTasksCompleted || isSaving}
                    className={`${allTasksCompleted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'} text-white transition-colors`}
                >
                    <CheckCircle className="w-3 h-3 mr-2" /> Complete
                </Button>
               ) : (
                <Button size="sm" onClick={handleStartTimer} className="bg-green-600 hover:bg-green-700 text-white">
                    <Play className="w-3 h-3 mr-2" /> Start Timer
                </Button>
            )}
        </div>
      </header>

      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center border-t-4 border-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Successfully Saved!</h3>
                <p className="text-sm text-slate-600 mb-6">Your progress and code have been securely stored.</p>
                <Button fullWidth onClick={() => setSaveSuccess(false)}>Continue</Button>
            </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 px-4">
         {assignment.questions.map((cell, idx) => {
            const hasRun = execStatus[cell.id] === 'success' || execStatus[cell.id] === 'error';
            const isPractice = cell.id.startsWith('P') || /\[P\d+\]/.test(cell.content);
            const showReviewHeader = idx === 0 && !isPractice;
            const prevWasPractice = idx > 0 && (assignment.questions[idx-1].id.startsWith('P') || /\[P\d+\]/.test(assignment.questions[idx-1].content));
            const showExerciseHeader = isPractice && (idx === 0 || !prevWasPractice);

            return (
            <React.Fragment key={cell.id}>
                {showReviewHeader && (
                    <div className="flex items-center gap-4 py-6 mt-2">
                         <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-lg">
                             <BookOpen className="w-5 h-5" /> Lecture Review
                         </div>
                         <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                )}
                {showExerciseHeader && (
                    <div className="flex items-center gap-4 py-6 mt-8">
                         <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-lg">
                              <Dumbbell className="w-5 h-5" /> Exercise
                         </div>
                         <div className="h-px bg-indigo-200 flex-1"></div>
                    </div>
               )}
                <div className={`flex gap-4 group transition-all rounded-xl p-4 ${isPractice ? 'bg-indigo-50/50 border border-indigo-100' : ''}`}>
                    <div className="w-8 flex-shrink-0 pt-2 text-right">
                        <span className={`font-mono text-xs font-bold ${isPractice ? 'text-indigo-400' : 'text-slate-400'}`}>#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className={`bg-white p-5 rounded-xl border shadow-sm relative ${isPractice ? 'border-indigo-100' : 'border-slate-200'}`}>
                                {isPractice && <div className="absolute top-0 right-0 px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-bl-lg rounded-tr-lg">Practice Task</div>}
                                <ManualMarkdown content={cell.content} />
                        </div>
                        {cell.type === 'code' && (
                            <div className={`rounded-xl border overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 ring-blue-500/20 ${execStatus[cell.id] === 'error' ? 'border-red-300' : execStatus[cell.id] === 'success' ? 'border-green-300' : 'border-slate-300'}`}>
                                <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center">
                                   <span className="text-xs font-mono text-slate-500 flex items-center gap-2"><Terminal className="w-3 h-3"/> Python 3.10</span>
                                   <button onClick={() => handleRunCode(cell.id)} disabled={!isReady} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                                      <Play className="w-3 h-3"/> Run Code
                                   </button>
                                </div>
                                <SimpleCodeEditor value={answers[cell.id] || ""} onChange={(val) => setAnswers({...answers, [cell.id]: val})} />

                                {/* Container for console output AND plots */}
                                {(consoleOutput[cell.id] || execStatus[cell.id]) && (
                                    <div className="border-t border-slate-700 bg-[#1e1e1e] p-3">
                                        {consoleOutput[cell.id] && (
                                          <>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Output</div>
                                            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{consoleOutput[cell.id]}</pre>
                                          </>
                                        )}
                                        {/* Plot Target Div - Day 10 Only */}
                                        {dayNum === 10 && (
                                            <div id={`plot-output-${cell.id}`} className="mt-2 flex justify-center bg-white rounded-lg overflow-hidden empty:hidden"></div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-2">
                            <button
                                onClick={() => hasRun && setVisibleSolutions(p => ({...p, [cell.id]: !p[cell.id]}))}
                                disabled={!hasRun}
                                className={`flex items-center gap-2 text-xs font-bold transition-colors ${hasRun ? 'text-slate-400 hover:text-slate-600 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}
                                title={!hasRun ? "Run your code first to unlock the solution" : ""}
                            >
                                {visibleSolutions[cell.id] ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                                {visibleSolutions[cell.id] ? "Hide Reference Solution" : "Show Reference Solution"}
                            </button>
                            {visibleSolutions[cell.id] && hasRun && (
                                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-100 rounded-lg animate-fade-in">
                                    <div className="text-[10px] font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Official Solution</div>
                                    <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap">{cell.solution_code || "# No solution provided"}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </React.Fragment>
            );
        })}
      </div>
    </div>
  );
};