// ==============================================================================
// FILE PATH: views/panels/HomeworkPanel.tsx
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Terminal, Save, Loader2, Send, RotateCcw, FileText, Award, CheckSquare, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { StudentRecord } from '../../types';
import Button from '../../components/Button';
import { supabase } from '../../data/supabaseClient';
import { usePyodide, AssignmentWithStatus } from './AssignmentUtils';

// --- CONSTANTS & HELPERS ---

const CUSTOM_INPUT_CODE = `
import sys, js
def input(prompt=""):
    val = js.prompt(f"🐍 Python Input:\\n{prompt}")
    if val is None: return ""
    print(f"{prompt}{val}")
    return str(val)
sys.modules['builtins'].input = input
`;

const normalizeString = (str: string) => str ? str.trim().replace(/^['"](.*)['"]$/, '$1') : '';

const processInline = (text: string) => text.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, i) => {
  if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
  if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-pink-600 font-mono text-xs border border-slate-200">{part.slice(1, -1)}</code>;
  return <span key={i}>{part}</span>;
});

const ManualMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const clean = content.replace(/\[(HW|P).*?\]\(.*?\)/gi, '').replace(/\[.*?\]\(.*?\)/g, '').replace(/\[(P|HW)\d+\]/g, '').trim();

  const blocks: { type: 'table' | 'text', lines: string[] | string }[] = [];
  let tableBuffer: string[] = [];

  clean.split('\n').forEach(line => {
      const t = line.trim();
      if (t.startsWith('|')) {
          tableBuffer.push(t);
      } else {
          if (tableBuffer.length) { blocks.push({ type: 'table', lines: tableBuffer }); tableBuffer = []; }
          blocks.push({ type: 'text', lines: t });
      }
  });
  if (tableBuffer.length) blocks.push({ type: 'table', lines: tableBuffer });

  return (
    <div className="font-sans text-sm text-slate-700">
      {blocks.map((b, i) => {
        if (b.type === 'table' && Array.isArray(b.lines)) {
           return (
             <div key={i} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
               <table className="min-w-full text-left text-xs">
                 <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>{(b.lines[0].split('|').filter(c => c.trim())).map((h, j) => <th key={j} className="px-4 py-2 border-r last:border-0 border-slate-200">{processInline(h.trim())}</th>)}</tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {b.lines.slice(1).filter(l => !l.includes('---')).map((r, ri) => (
                      <tr key={ri} className="hover:bg-slate-50/50">
                        {r.split('|').filter(c => c.trim()).map((c, ci) => <td key={ci} className="px-4 py-2 border-r last:border-0 border-slate-100">{processInline(c.trim())}</td>)}
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           );
        }
        const t = b.lines as string;
        if (!t) return <div key={i} className="h-4" />;
        if (t.startsWith('####')) return <h3 key={i} className="text-lg font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-2">{t.replace(/####\s*/, '')}</h3>;
        if (t.startsWith('###')) return <h4 key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">{t.replace(/###\s*/, '')}</h4>;
        if (t.startsWith('- ')) return <div key={i} className="flex gap-2 ml-2 mb-1"><span className="font-bold text-slate-400">•</span><span>{processInline(t.substring(2))}</span></div>;
        if (t.startsWith('    ') || t.startsWith('\t') || t.startsWith('  ')) return <div key={i} className="ml-4 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono text-xs text-slate-600 w-fit mb-1">{t}</div>;
        return <div key={i} className="leading-relaxed mb-1">{processInline(t)}</div>;
      })}
    </div>
  );
};

const SimpleCodeEditor: React.FC<{ value: string; onChange: (val: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lines = value.split('\n');
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab' && !disabled) {
            e.preventDefault();
            const { selectionStart: s, selectionEnd: end } = e.currentTarget;
            onChange(value.substring(0, s) + "    " + value.substring(end));
            setTimeout(() => { if (textareaRef.current) textareaRef.current.selectionStart = textareaRef.current.selectionEnd = s + 4; }, 0);
        }
    };
    return (
        <div className="flex bg-[#1e1e1e] overflow-hidden relative" style={{ height: `${Math.max(lines.length + 2, 3) * 24}px` }}>
            <div className="w-10 bg-slate-900 text-slate-500 text-right pr-2 pt-4 select-none font-mono text-sm leading-6 border-r border-slate-700 shrink-0">
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea ref={textareaRef} className="flex-1 bg-transparent text-slate-100 font-mono text-sm leading-6 p-0 pl-3 pt-4 resize-none focus:outline-none whitespace-pre disabled:opacity-50" value={value} onChange={e => onChange(e.target.value)} onKeyDown={handleKeyDown} spellCheck={false} disabled={disabled} />
        </div>
    );
};

// --- TYPES ---
interface TestResult { input: string; expected: string; actual: string; passed: boolean; visible: boolean; }
interface GradingResult { score: number; maxPoints: number; tests: TestResult[]; }
interface HomeworkPanelProps { user: StudentRecord; assignment: AssignmentWithStatus; onBack: () => void; onComplete?: (id: string, score: number) => void; }

// --- MAIN COMPONENT ---
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
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isLate, setIsLate] = useState(false);

  const getTotalScore = () => finalScore !== null ? finalScore : Object.values(gradingResults).reduce((acc, r) => acc + r.score, 0);
  const getMaxScore = () => Object.values(gradingResults).reduce((acc, r) => acc + r.maxPoints, 0);

  useEffect(() => {
    const init = async () => {
      // 1. Deadline Calculation
      try {
          const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'course_start_date').single();
          if (settings?.value) {
              const dayIndex = assignment.day_index || 0;
              if (dayIndex <= 0) {
                  setDeadline(null);
              } else {
                  const start = new Date(settings.value);
                  // 1. Normalize: Shift dayIndex so Day 1 becomes 0 (Monday)
                  const adjustedIndex = dayIndex - 1;
                  // 2. Calculate full weeks passed (0-4 -> 0 weeks, 5-9 -> 1 week)
                  const weeks = Math.floor(adjustedIndex / 5);
                  // 3. Find day of the week (0=Mon, 1=Tue ... 4=Fri)
                  const dayOfWeek = adjustedIndex % 5;
                  // 4. Determine deadline buffer: If Friday (4), add 3 days (Sat+Sun+Mon). Otherwise, add 1 day.
                  const buffer = dayOfWeek === 4 ? 3 : 1;
                  const ddl = new Date(start);
                  // 5. Apply: Start Date + Weeks Offset + Day Offset + Deadline Buffer
                  ddl.setDate(start.getDate() + (weeks * 7) + dayOfWeek + buffer);

                  ddl.setHours(13, 0, 0, 0); // 1:00 PM
                  setDeadline(ddl);

                  const now = new Date();
                  const late = now.getTime() > ddl.getTime();
                  console.log(`[Deadline Debug]\nCurrent: ${now.toLocaleString()}\nDue:     ${ddl.toLocaleString()}\nLate?:   ${late}`);
                  setIsLate(late);
              }
          }
      } catch (e) { console.error(e); }

      // 2. Storage Shim & Data Load
      try { const m = { length:0, getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{}, key:()=>null }; Object.defineProperty(window,'sessionStorage',{value:m,writable:true}); Object.defineProperty(window,'localStorage',{value:m,writable:true}); } catch(e){}

      const defaults: Record<string, string> = {};
      assignment.questions?.forEach(q => { if(q.type==='code' && q.starter_code) defaults[q.id] = q.starter_code; });
      setAnswers(defaults);

      if (user.role !== 'guest') {
        const { data } = await supabase.from('user_assignment_progress').select('*').match({ user_id: user.id, assignment_id: assignment.id }).maybeSingle();
        if (data) {
            setAnswers(prev => ({ ...prev, ...(data.saved_answers || {}) }));
            if (data.status === 'submitted') {
                setIsSubmitted(true);
                setFinalScore(data.score);
                if (data.validation_status?.['Q1']?.tests || data.validation_status?.[Object.keys(data.validation_status)[0]]?.tests) setGradingResults(data.validation_status);
                else setExecStatus(data.validation_status);
            } else if (data.validation_status) {
                setExecStatus(data.validation_status);
            }
        }
      }
    };
    init();
  }, [user.id, assignment]);

  const handleRestart = async () => {
    if (!confirm("Restart Kernel? This will clear outputs.")) return;
    setExecStatus({}); setConsoleOutput({});
    if (pyodide && isReady) {
       try {
           await pyodide.runPythonAsync(`for n in list(globals().keys()):\n if not n.startswith("_") and n not in ['sys','js','input','io','pyodide']: del globals()[n]`);
           await pyodide.runPythonAsync(CUSTOM_INPUT_CODE);
       } catch (e) { console.error(e); }
    }
  };

  const handleSave = async (silent = false, gradingData: any = null, score = 0) => {
      try {
          setIsSaving(true);
          const payload: any = { user_id: user.id, assignment_id: assignment.id, score, saved_answers: answers, validation_status: gradingData || execStatus, submitted_at: new Date().toISOString() };
          if (gradingData) payload.status = 'submitted';
          const { error } = await supabase.from('user_assignment_progress').upsert(payload, { onConflict: 'user_id, assignment_id' });
          if (error) throw error;
          if (!silent) setSaveSuccess(true);
          if (gradingData && onComplete) onComplete(assignment.id, score);
      } catch (err: any) { alert(`Save failed: ${err.message}`); } finally { setIsSaving(false); }
  };

  const parseVariables = (code: string) => {
      const delim = "# solution code below";
      if (!code.includes(delim)) return { code, vars: [] };
      const [setup, exec] = code.split(delim);
      const vars = [...setup.matchAll(/^\s*([a-zA-Z_]\w*)\s*=/gm)].map(m => m[1]);
      return { code: exec, vars, ignoredTop: true };
  };

  const runTestLogic = async (test: any, code: string, vars: string[]) => {
      await pyodide.runPythonAsync(`for v in ['km','a','b','n','result','channel_A','channel_B','temp','meters','reversed_number','d1','d2','d3','d4']: \n if v in globals(): del globals()[v]`);
//       const inputs = test.input.split(',').map((s:string) => s.trim());

//       let injection = "";
//       if (vars.length > 0 && inputs.length === vars.length) vars.forEach((v, i) => injection += `${v} = ${inputs[i]}\n`);
//       else if (vars.length === 1) injection = `${vars[0]} = ${test.input}\n`;

      let injection = "";
      if (vars.length > 0) {
          // Let Python handle the unpacking. This supports dicts, lists, and multi-line inputs automatically.
          injection = `${vars.join(',')} = (${test.input.trim()})\n`;
      }

      if (injection) await pyodide.runPythonAsync(injection);
      else try { await pyodide.runPythonAsync(test.input); } catch(e){}

      let captured = "";
      pyodide.setStdout({ batched: (msg: string) => captured += msg });
      await pyodide.runPythonAsync(code);
      return captured.trim();
  };

  const performGrading = async () => {
      setIsSaving(true); setShowConfirmModal(false);
      const results: Record<string, GradingResult> = {};
      let totalScore = 0;

      await pyodide.runPythonAsync(CUSTOM_INPUT_CODE);
      for (const q of assignment.questions) {
          if (q.type !== 'code') continue;
          const { code: runCode, vars } = parseVariables(answers[q.id] || "");
          const tests = q.validation?.test_cases || [];
          const testRes: TestResult[] = [];
          let allPassed = true;

          if (!tests.length) allPassed = runCode.trim().length > 0;
          else {
              for (const t of tests) {
                  let actual = "", passed = false, runError = false;
                  try {
                      actual = await runTestLogic(t, runCode, vars);
                      passed = actual === t.expected.toString().trim();
                      if (!passed) passed = normalizeString(actual) === normalizeString(t.expected.toString().trim());
                      if (!passed) { const fa = parseFloat(actual), fe = parseFloat(t.expected.toString().trim()); if (!isNaN(fa) && !isNaN(fe)) passed = Math.abs(fa - fe) < 0.01; }
                  } catch (e) { actual = "Runtime Error"; runError = true; }

                  if (!passed) allPassed = false;
                  testRes.push({ input: t.input, expected: t.expected.toString().trim(), actual, passed, visible: !!t.visible });
              }
          }
          const earned = allPassed ? (q.points || 0) : 0;
          totalScore += earned;
          results[q.id] = { score: earned, maxPoints: q.points || 0, tests: testRes };
      }

      if (isLate && totalScore > 0) totalScore = Math.ceil(totalScore * 0.6);
      setFinalScore(totalScore); setGradingResults(results); setIsSubmitted(true);
      await handleSave(true, results, totalScore);
  };

  const handleRunCode = async (qid: string) => {
     if (!pyodide) return 0;
     setExecStatus(p => ({ ...p, [qid]: 'running' }));
     setConsoleOutput(p => ({ ...p, [qid]: `🚀 Starting Pre-check...\n` }));

     const q = assignment.questions.find(q => q.id === qid);
     const tests = q?.validation?.test_cases?.filter(t => t.visible !== false) || [];
     if (!tests.length) { setConsoleOutput(p=>({...p, [qid]: "⚠️ No visible tests."})); setExecStatus(p=>({...p, [qid]: 'success'})); return 1; }

     const { code: runCode, vars, ignoredTop } = parseVariables(answers[qid] || "");
     let passed = 0, log = "";

     try {
         await pyodide.runPythonAsync(CUSTOM_INPUT_CODE);
         for (let i = 0; i < tests.length; i++) {
             const t = tests[i];
             const actual = await runTestLogic(t, runCode, vars);
             const expected = t.expected.toString().trim();
             let match = actual === expected;
             if (!match) match = normalizeString(actual) === normalizeString(expected);
             if (!match) { const fa = parseFloat(actual), fe = parseFloat(expected); if (!isNaN(fa) && !isNaN(fe)) match = Math.abs(fa - fe) < 0.01; }

             if (match) { passed++; log += `✅ [Test #${i+1}] PASS\n   Input: ${t.input}\n   Output: ${actual}\n`; }
             else { log += `❌ [Test #${i+1}] FAIL\n   Input: ${t.input}\n   Expected: ${expected}\n   Got: ${actual}\n`; if(!ignoredTop) log += `   ⚠️ Hint: ensure delimiter present.\n`; }
         }
         setConsoleOutput(p => ({ ...p, [qid]: log })); setExecStatus(p => ({ ...p, [qid]: 'success' }));
         await handleSave(true); // Auto-save logic
         return passed / tests.length;
     } catch (e: any) {
         setConsoleOutput(p => ({ ...p, [qid]: `🔥 Error:\n${e.message}` })); setExecStatus(p => ({ ...p, [qid]: 'error' }));
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
               {deadline ? (
                   <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-mono">
                       <Clock className="w-3 h-3" /> Due: {deadline.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                       {isLate && !isSubmitted && <span className="text-amber-700 font-bold ml-2">(LATE 60%)</span>}
                   </div>
               ) : <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono italic"><Clock className="w-3 h-3" /> No Deadline</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleRestart} disabled={isSubmitted} className="text-slate-500 hover:text-red-600 hover:bg-red-50"><RotateCcw className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => handleSave(false)} disabled={isSaving || isSubmitted || user.role === 'guest'} className="text-slate-600 border-slate-300 hover:bg-slate-100">
                {isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />} Save Draft
            </Button>
            {isSubmitted ? (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg border border-slate-200 font-bold text-sm select-none">
                    <CheckSquare className="w-4 h-4 text-green-600"/> <span>Score: {getTotalScore()} / {getMaxScore()}</span>
                </div>
            ) : (
                <Button size="sm" onClick={() => setShowConfirmModal(true)} disabled={isSaving} className={`text-white ${isLate ? 'bg-amber-800 hover:bg-amber-900' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    <Send className="w-3 h-3 mr-2" /> Submit
                </Button>
            )}
        </div>
      </header>

      {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isLate ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-600'}`}><AlertTriangle className="w-8 h-8" /></div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{isLate ? "Late Submission" : "Ready to Submit?"}</h3>
                  <p className="text-slate-600 text-sm mb-6">{isLate ? "Deadline passed. Score capped at 60%." : "Answers are auto-graded and final."}</p>
                  <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                      <Button onClick={performGrading} className={`${isLate ? 'bg-amber-800' : 'bg-purple-600'} text-white`}>{isLate ? 'Accept & Submit' : 'Grade It'}</Button>
                  </div>
              </div>
          </div>
      )}

      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center border-t-4 border-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Send className="w-6 h-6 text-green-600" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{isSubmitted ? 'Submitted!' : 'Saved!'}</h3>
                <Button fullWidth onClick={() => setSaveSuccess(false)}>Continue</Button>
            </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 px-4">
         {assignment.questions && assignment.questions.map((cell: any, idx: number) => {
            const result = gradingResults[cell.id];
            return (
            <React.Fragment key={cell.id}>
                {idx === 0 && <div className="flex items-center gap-4 py-6 mt-2"><div className="flex items-center gap-2 text-purple-600 font-bold uppercase tracking-wider text-lg"><FileText className="w-5 h-5" /> Questions</div><div className="h-px bg-purple-200 flex-1"></div></div>}
                <div className="flex gap-4 group transition-all rounded-xl p-4 bg-purple-50/30 border border-purple-100">
                    <div className="w-8 pt-2 text-right"><span className="font-mono text-xs font-bold text-purple-400">Q{idx + 1}</span></div>
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm relative">
                            {cell.points !== undefined && <div className="absolute top-0 right-0 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-bl-lg rounded-tr-lg flex items-center gap-1"><Award className="w-3 h-3" /> {cell.points} Pts</div>}
                            <ManualMarkdown content={cell.content || ""} />
                        </div>
                        {cell.type === 'code' && (
                            <div className={`rounded-xl border overflow-hidden bg-white shadow-sm ring-purple-500/20 ${execStatus[cell.id] === 'error' ? 'border-red-300' : execStatus[cell.id] === 'success' ? 'border-green-300' : 'border-slate-300'}`}>
                                <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center">
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-2"><Terminal className="w-3 h-3"/> Python 3.10</span>
                                    <button onClick={() => handleRunCode(cell.id)} disabled={!isReady || isSubmitted} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md text-white shadow-sm transition-colors ${isSubmitted ? 'bg-slate-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}><Play className="w-3 h-3"/> Pre-check</button>
                                </div>
                                <SimpleCodeEditor value={answers[cell.id] || ""} onChange={(val) => setAnswers({...answers, [cell.id]: val})} disabled={isSubmitted} />
                                {(consoleOutput[cell.id] && !isSubmitted) && <div className="border-t border-slate-700 bg-[#1e1e1e] p-3"><div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Output</div><pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{consoleOutput[cell.id]}</pre></div>}
                            </div>
                        )}
                        {isSubmitted && result && (
                            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center"><h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><CheckSquare className="w-4 h-4"/> Report</h4><div className={`text-xs font-bold px-2 py-1 rounded ${result.score > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Score: {result.score}/{result.maxPoints}</div></div>
                                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-white border-b border-slate-100"><tr><th className="px-4 py-2 text-slate-500">Input</th><th className="px-4 py-2 text-slate-500">Expected</th><th className="px-4 py-2 text-slate-500">Actual</th><th className="px-4 py-2 text-right text-slate-500">Status</th></tr></thead><tbody className="divide-y divide-slate-50 bg-white">{result.tests.map((t, i) => (<tr key={i} className={t.passed ? 'bg-white' : 'bg-red-50/50'}><td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.input}</td><td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.expected}</td><td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[120px]">{t.actual}</td><td className="px-4 py-2 text-right">{t.passed ? <span className="inline-flex items-center text-green-600 font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Pass</span> : <span className="inline-flex items-center text-red-600 font-bold"><XCircle className="w-3 h-3 mr-1"/> Fail</span>}</td></tr>))}</tbody></table></div>
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
