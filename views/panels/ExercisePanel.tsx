import React, { useState, useEffect } from 'react';
import { StudentRecord } from '../../types';
import Button from '../../components/Button';
import { ChevronLeft, Play, Clock, Terminal, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '../../data/supabaseClient';
import { usePyodide, formatTime, AssignmentWithStatus } from './AssignmentUtils';

interface ExercisePanelProps {
  user: StudentRecord;
  assignment: AssignmentWithStatus;
  onBack: () => void;
}

export const ExercisePanel: React.FC<ExercisePanelProps> = ({ user, assignment, onBack }) => {
  const { isReady, pyodide, error: pyodideError } = usePyodide();

  // State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [execStatus, setExecStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [consoleOutput, setConsoleOutput] = useState<Record<string, string>>({});
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Load saved progress
  useEffect(() => {
    const loadProgress = async () => {
      if (user.role === 'guest') return;
      const { data } = await supabase.from('user_assignment_progress')
         .select('saved_answers')
         .match({ user_id: user.id, assignment_id: assignment.id })
         .maybeSingle();
      if (data?.saved_answers) setAnswers(data.saved_answers);
    };
    loadProgress();
  }, [user.id, assignment.id]);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasStarted) {
      timer = setInterval(() => setElapsedTime(p => p + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [hasStarted]);

  const handleStart = () => {
      setHasStarted(true);
      setElapsedTime(0);
  };

  const handleRunCode = async (cellId: string) => {
     if (!pyodide) return;
     setExecStatus(prev => ({ ...prev, [cellId]: 'running' }));
     setConsoleOutput(prev => ({ ...prev, [cellId]: 'Running...\n' }));

     const userCode = answers[cellId] || "";
     try {
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
    <div className="space-y-6 relative min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10 pt-2 px-4">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
        <div>
           <div className="flex items-center gap-2">
             <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700">Exercise</span>
             <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
           </div>
           {hasStarted && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                 <Clock className="w-3 h-3" /> {formatTime(elapsedTime)}
              </div>
           )}
        </div>
      </header>

      {/* Start Overlay */}
      {!hasStarted && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col">
              <div className="bg-white p-8 rounded-2xl shadow-2xl border text-center max-w-md">
                  <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-blue-600">
                      <Play className="w-8 h-8 ml-1" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Start?</h2>
                  <Button fullWidth onClick={handleStart} size="lg">Start Exercise Session</Button>
              </div>
          </div>
      )}

      {/* Content */}
      <div className={`max-w-4xl mx-auto space-y-12 pb-20 px-4 ${!hasStarted ? 'blur-sm select-none' : ''}`}>
         {assignment.questions.map((cell, idx) => (
            <div key={idx} className="flex gap-4 group">
               <div className="w-8 flex-shrink-0 pt-2 text-right">
                   <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
               </div>
               <div className="flex-1 min-w-0 space-y-4">
                   <div className="prose prose-slate prose-sm max-w-none bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <pre className="whitespace-pre-wrap font-sans text-slate-700">{cell.content}</pre>
                   </div>

                   {cell.type === 'code' && (
                       <div className={`rounded-xl border overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 ring-blue-500/20 ${execStatus[cell.id] === 'error' ? 'border-red-300' : execStatus[cell.id] === 'success' ? 'border-green-300' : 'border-slate-300'}`}>
                           <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center">
                               <span className="text-xs font-mono text-slate-500 flex items-center gap-2"><Terminal className="w-3 h-3"/> Python 3.10</span>
                               <button onClick={() => handleRunCode(cell.id)} disabled={!isReady} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                                   <Play className="w-3 h-3"/> Run Code
                               </button>
                           </div>
                           <textarea
                             className="w-full bg-[#1e1e1e] text-slate-100 font-mono text-sm p-4 min-h-[120px] resize-y focus:outline-none"
                             value={answers[cell.id] || ""}
                             onChange={(e) => setAnswers({...answers, [cell.id]: e.target.value})}
                             placeholder="# Type your solution here..." spellCheck={false}
                           />
                           {(consoleOutput[cell.id]) && (
                               <div className="border-t border-slate-700 bg-[#1e1e1e] p-3">
                                   <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Output</div>
                                   <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{consoleOutput[cell.id]}</pre>
                               </div>
                           )}
                       </div>
                   )}

                   {/* Solution Toggle */}
                   <div className="mt-2">
                       <button onClick={() => setVisibleSolutions(p => ({...p, [cell.id]: !p[cell.id]}))} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                           {visibleSolutions[cell.id] ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                           {visibleSolutions[cell.id] ? "Hide Reference Solution" : "Show Reference Solution"}
                       </button>
                       {visibleSolutions[cell.id] && (
                           <div className="mt-2 p-4 bg-yellow-50 border border-yellow-100 rounded-lg animate-fade-in">
                               <div className="text-[10px] font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Official Solution</div>
                               <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap">{cell.solution_code || "# No solution provided"}</pre>
                           </div>
                       )}
                   </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};