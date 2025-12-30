import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle, XCircle, ChevronLeft, Save, Award, Terminal, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../data/supabaseClient';
import { usePyodide, INPUT_OVERRIDE_CODE } from './AssignmentUtils';

// --- MARKDOWN FORMATTER HELPERS (Kept from previous step) ---
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
  const cleanContent = content.replace(/\[HW_.*?\]\(.*?\)/gi, '').trim();
  return <div className="font-sans">{cleanContent.split('\n').map((line, idx) => formatLine(line, idx))}</div>;
};

// --- TYPES ---
type TestCase = { input: string; expected: string; visible?: boolean; };
type Question = { id: string; type: 'code' | 'markdown'; content: string; points?: number; starter_code?: string; validation?: { test_cases: TestCase[]; }; };
type AssignmentData = { id: string; title: string; questions: Question[]; max_score: number; user_score?: number; user_status?: string; };
interface HomeworkPanelProps { user: any; assignment: AssignmentData; onBack: () => void; onComplete?: (id: string, score: number) => void; }

export const HomeworkPanel: React.FC<HomeworkPanelProps> = ({ user, assignment, onBack, onComplete }) => {
  const { isReady, pyodide } = usePyodide();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [execStatus, setExecStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [consoleOutput, setConsoleOutput] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock if submitted
  const isSubmitted = assignment.user_status === 'submitted';

  // 1. Initialize State
  useEffect(() => {
    const initData = async () => {
      const initialAnswers: Record<string, string> = {};
      assignment.questions.forEach(q => {
          if (q.type === 'code' && q.starter_code) initialAnswers[q.id] = q.starter_code;
      });

      if (user?.id) {
        const { data } = await supabase.from('user_assignment_progress')
            .select('saved_answers')
            .match({ user_id: user.id, assignment_id: assignment.id })
            .maybeSingle();
        if (data?.saved_answers) Object.assign(initialAnswers, data.saved_answers);
      }
      setAnswers(initialAnswers);
    };
    initData();
  }, [assignment, user.id]);

  // --- CORE VALIDATION ENGINE ---
  const handleRunCode = async (questionId: string, mode: 'pre-check' | 'grade') => {
     if (!pyodide) return 0;
     setExecStatus(prev => ({ ...prev, [questionId]: 'running' }));
     setConsoleOutput(prev => ({ ...prev, [questionId]: `🚀 Starting ${mode === 'pre-check' ? 'Pre-Check' : 'Grading'}...\n` }));

     const userCode = answers[questionId] || "";
     const question = assignment.questions.find(q => q.id === questionId);
     if (!question) return 0;

     const allTests = question.validation?.test_cases || [];
     const testsToRun = mode === 'pre-check' ? allTests.filter(tc => tc.visible !== false) : allTests;

     if (testsToRun.length === 0) {
         setConsoleOutput(prev => ({ ...prev, [questionId]: "⚠️ No test cases defined." }));
         setExecStatus(prev => ({ ...prev, [questionId]: 'success' }));
         return 1;
     }

     const delimiter = "# solution code below";
     let codeToExecute = userCode;
     let ignoredTop = false;
     if (userCode.includes(delimiter)) {
         const parts = userCode.split(delimiter);
         if (parts.length > 1) { codeToExecute = parts[1]; ignoredTop = true; }
     }

     let passedCount = 0;
     let logBuffer = "";

     try {
         await pyodide.runPythonAsync(INPUT_OVERRIDE_CODE || "sys_inputs = []");
         for (let i = 0; i < testsToRun.length; i++) {
             const test = testsToRun[i];
             await pyodide.runPythonAsync(`for v in ['km', 'a', 'b', 'n', 'result', 'channel_A', 'channel_B', 'temp', 'meters', 'reversed_number']:
                if v in globals(): del globals()[v]`);
             try { await pyodide.runPythonAsync(test.input); } catch (e) {}

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

             const label = test.visible !== false ? `Test #${i+1}` : `Test #${i+1} (Hidden)`;
             if (isMatch) {
                 passedCount++;
                 logBuffer += `✅ [${label}] PASS\n   Input: ${test.input.replace(/\n/g, ', ')}\n   Output: ${actual}\n`;
             } else {
                 logBuffer += `❌ [${label}] FAIL\n   Input: ${test.input.replace(/\n/g, ', ')}\n   Expected: ${expected}\n   Got: ${actual}\n`;
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

  // --- NEW: UPDATE GLOBAL XP ---
  const updateGlobalProgress = async (addedScore: number) => {
    // 1. Fetch current progress
    const { data: currentProgress } = await supabase
        .from('user_practice_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (currentProgress) {
        // 2. Add to existing
        await supabase
            .from('user_practice_progress')
            .update({
                total_score: (currentProgress.total_score || 0) + addedScore,
                total_count: (currentProgress.total_count || 0) + 1
            })
            .eq('user_id', user.id);
    } else {
        // 3. Create new if missing
        await supabase
            .from('user_practice_progress')
            .insert({
                user_id: user.id,
                total_score: addedScore,
                total_count: 1,
                level_counts: {},
                topic_counts: {},
                solved_ids: []
            });
    }
  };


  const handleSubmit = async () => {
    if (user.role === 'guest') {
        alert("Demo Mode: Submission simulated.");
        return;
    }
    setShowConfirm(false);
    setIsSubmitting(true);

    try {
        // 1. Grade locally
        let totalScore = 0;
        const codeQuestions = assignment.questions.filter(q => q.type === 'code');
        for (const q of codeQuestions) {
            const ratio = await handleRunCode(q.id, 'grade');
            totalScore += Math.round((q.points || 0) * ratio);
        }

        // 2. Update 'user_assignment_progress'
        const { error: assignError } = await supabase
            .from('user_assignment_progress')
            .upsert({
                user_id: user.id,
                assignment_id: assignment.id,
                status: 'submitted',
                score: totalScore,
                saved_answers: answers,
                submitted_at: new Date().toISOString()
            }, { onConflict: 'user_id, assignment_id' });

        if (assignError) throw assignError;

        // 3. Update 'user_progress' (Global XP)
        if (totalScore > 0) {
            await updateGlobalProgress(totalScore);
        }

        // 4. Finish
        if (onComplete) onComplete(assignment.id, totalScore);
        alert(`Submission Complete!\nTotal Score: ${totalScore}/${assignment.max_score}`);
        onBack();
    } catch (err: any) {
        console.error("Submission Error:", err);
        // Better error message for RLS issues
        if (err.message.includes("row-level security")) {
            alert("Database Error: Row-Level Security is enabled but no policy exists. Please disable RLS in Supabase Table settings.");
        } else {
            alert(`Failed to save progress: ${err.message}`);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen">
      <header className="flex items-center gap-4 border-b border-slate-200 pb-4 sticky top-0 bg-white z-10 p-4 shadow-sm">
         <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
         <div className="flex-1">
             <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
             <div className="text-xs text-slate-500">Max Score: {assignment.max_score} pts</div>
         </div>
         {/* Show SCORE if submitted, otherwise SUBMIT button */}
         {!isSubmitted ? (
             <button
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
             >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                Submit
             </button>
         ) : (
             <div className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg border border-yellow-200 font-bold flex gap-2">
                 <Award className="w-4 h-4"/> Score: {assignment.user_score}
             </div>
         )}
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-8">
         {assignment.questions.map((q, idx) => (
            <div key={q.id} className="flex gap-4">
               <div className="w-8 pt-2 text-right font-mono text-xs font-bold text-slate-400">#{idx + 1}</div>
               <div className="flex-1 space-y-4">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <ManualMarkdown content={q.content} />
                   </div>
                   {q.type === 'code' && (
                       <div className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-sm">
                           <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center">
                               <span className="text-xs font-mono text-slate-500 flex gap-2"><Terminal className="w-3 h-3"/> Python 3.10</span>
                               {!isSubmitted && (
                                   <div className="flex gap-2">
                                       <button
                                          onClick={() => handleRunCode(q.id, 'pre-check')}
                                          disabled={!isReady || execStatus[q.id] === 'running'}
                                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                       >
                                          {execStatus[q.id] === 'running' ? <RefreshCw className="w-3 h-3 animate-spin"/> : <CheckCircle className="w-3 h-3 text-green-600"/>}
                                          Pre-Check
                                       </button>
                                   </div>
                               )}
                           </div>
                           <textarea
                             className="w-full bg-[#1e1e1e] text-slate-100 font-mono text-sm p-4 min-h-[200px] resize-y focus:outline-none disabled:opacity-50"
                             value={answers[q.id] || ""}
                             onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                             disabled={isSubmitted} // <--- LOCKS EDITOR
                             spellCheck={false}
                           />
                           {(consoleOutput[q.id] || execStatus[q.id] === 'running') && (
                               <div className="border-t border-slate-700 bg-[#1e1e1e] p-3">
                                   <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Console Output</div>
                                   <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                       {consoleOutput[q.id]}
                                   </pre>
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>
         ))}
      </div>

      {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4"/>
                  <h3 className="font-bold text-lg text-slate-900">Submit Assignment?</h3>
                  <p className="text-sm text-slate-600 my-2">This will lock your answers and update your XP.</p>
                  <div className="flex gap-2 mt-6">
                      <button className="flex-1 py-2 rounded-lg border hover:bg-slate-50 font-bold" onClick={() => setShowConfirm(false)}>Cancel</button>
                      <button className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700" onClick={handleSubmit}>Confirm</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};