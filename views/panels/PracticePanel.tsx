// ==============================================================================
// FILE PATH: views/panels/PracticePanel.tsx
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../data/supabaseClient';
import { PracticeQuestion, UserProgress, User } from '../../types';
import Button from '../../components/Button';
import { Play, CheckCircle, RefreshCw, AlertCircle, ArrowRight, Terminal, Lock, Unlock, Clock, Zap, Loader2, Trophy, Award, Medal, Timer, XCircle } from 'lucide-react';

// Global Pyodide Type
declare global {
  interface Window {
    loadPyodide: any;
    _input_queue: any[];
  }
}

// ----------------------------------------------------------------------
// SYSTEM PROMPT: Python Shim for Input Mocking (Silent Version)
// ----------------------------------------------------------------------
const INPUT_OVERRIDE_CODE = `
def input(prompt=""):
    # 'sys_inputs' is injected as a global list before running
    if 'sys_inputs' in globals() and len(sys_inputs) > 0:
        val = sys_inputs.pop(0)
        return str(val)
    return ""
`;

// [FIX] 1. Define Props to accept the current User
interface PracticePanelProps {
  user: User;
}

export const PracticePanel: React.FC<PracticePanelProps> = ({ user }) => {
  // --- State ---
  const [currentQ, setCurrentQ] = useState<PracticeQuestion | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [isLoadingQ, setIsLoadingQ] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);

  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'success' | 'error';
    msg: string;
    output?: string;
    runtime?: number;
  }>({ status: 'idle', msg: '' });

  const [showSolution, setShowSolution] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showReward, setShowReward] = useState<{title: string, msg: string} | null>(null);

  // Challenge Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Engine State
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState("Loading Engine...");
  const pyodideRef = useRef<any>(null);

  // --- 1. Initialization ---
  useEffect(() => {
    const init = async () => {
      // A. Storage Patch
      try { const check = window.sessionStorage; } catch (e) {
        const mockStorage = { length: 0, getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null };
        try {
            Object.defineProperty(window, 'sessionStorage', { value: mockStorage, configurable: true, writable: true });
            Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
        } catch (err) {}
      }

      // B. Load Pyodide
      if (!window.loadPyodide) {
         setEngineStatus("Downloading Python...");
         await new Promise<void>((resolve, reject) => {
             const script = document.createElement('script');
             script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
             script.onload = () => resolve();
             script.onerror = () => reject(new Error("Failed to load Pyodide script"));
             document.head.appendChild(script);
         });
      }

      // C. Init Engine
      try {
        if (!pyodideRef.current) {
          setEngineStatus("Initializing Python...");
          const pyodide = await window.loadPyodide();
          pyodideRef.current = pyodide;
          setIsEngineReady(true);
        }
      } catch (err: any) {
        setFeedback({ status: 'error', msg: `Engine Failure: ${err.message}` });
      }

      // [FIX] 2. Pass user.id to fetchUserData
      await fetchUserData(user.id);
      await fetchTopics();
      fetchRandomQuestion('all');
    };

    init();
  }, [user.id]); // Re-run if user changes

  // --- Timer Logic ---
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
        setIsTimedOut(true);
        return;
    }
    const timerId = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Data Fetching ---

  // [FIX] 3. Fetch progress strictly for this userId
  const fetchUserData = async (userId: string) => {
      const { data } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId) // <--- STRICT FILTER
        .maybeSingle();

      if (data) {
          setUserProgress(data as UserProgress);
      } else {
          // Initialize empty local state for new user
          setUserProgress({
              user_id: userId,
              total_score: 0,
              total_count: 0,
              level_counts: {},
              topic_counts: {},
              solved_ids: []
          });
      }
  };

  const fetchTopics = async () => {
      const { data } = await supabase.from('practice_questions').select('topic');
      if (data) {
          const unique = Array.from(new Set(data.map(d => d.topic)));
          setTopics(unique);
      }
  };

  const fetchRandomQuestion = async (topic: string) => {
      setIsLoadingQ(true);
      setFeedback({ status: 'idle', msg: '' });
      setCode('');
      setShowSolution(false);
      setAttempts(0);
      setIsTimedOut(false);
      setTimeLeft(null);

      let query = supabase.from('practice_questions').select('*', { count: 'exact', head: true });
      if (topic !== 'all') query = query.eq('topic', topic);
      const { count } = await query;

      if (!count) {
          setCurrentQ(null);
          setIsLoadingQ(false);
          return;
      }

      const randomOffset = Math.floor(Math.random() * count);
      let dataQuery = supabase.from('practice_questions').select('*').range(randomOffset, randomOffset);
      if (topic !== 'all') dataQuery = dataQuery.eq('topic', topic);

      const { data } = await dataQuery;

      if (data && data.length > 0) {
          const question = data[0] as PracticeQuestion;
          setCurrentQ(question);
          setCode(question.starter_code);

          if (question.difficulty === 'challenge') {
              setTimeLeft(300);
          }
      }
      setIsLoadingQ(false);
  };

  // --- Execution Logic ---
  const runCode = async () => {
    if (!isEngineReady || !currentQ || isTimedOut) return;

    setFeedback({ status: 'idle', msg: 'Running tests...' });
    setAttempts(p => p + 1);

    try {
      const startTime = performance.now();
      let allPassed = true;
      let logs: string[] = [];

      for (const testCase of currentQ.test_cases) {
         const outputBuffer: string[] = [];
         pyodideRef.current.setStdout({ batched: (msg: string) => outputBuffer.push(msg) });

         const inputsDefinition = `sys_inputs = ${JSON.stringify(testCase.inputs)}`;
         const fullScript = `${inputsDefinition}\n${INPUT_OVERRIDE_CODE}\n${code}`;

         await pyodideRef.current.runPythonAsync(fullScript);

         const actualRaw = outputBuffer.join('\n').trim();
         const expectedRaw = testCase.expected.trim();

         if (actualRaw !== expectedRaw) {
             allPassed = false;
             logs.push(`❌ Test Failed.\nInput: ${JSON.stringify(testCase.inputs)}\nExpected: "${expectedRaw}"\nGot: "${actualRaw}"`);
             break;
         }
      }

      const endTime = performance.now();
      const runtime = Math.round(endTime - startTime);

      if (allPassed) {
         handleSuccess(runtime);
         setFeedback({
             status: 'success',
             msg: `Success! (+${currentQ.score_value} XP)`,
             output: "Great job! Code works efficiently.",
             runtime
         });
         setTimeLeft(null);
      } else {
         handleFailure();
         setFeedback({ status: 'error', msg: 'Logic Error', output: logs.join('\n') });
      }

    } catch (err: any) {
      setFeedback({ status: 'error', msg: 'Runtime Error', output: err.message });
    }
  };

  // --- Persistence ---
  const handleFailure = async () => {
      console.log("Validation failed.");
  };

  const handleSuccess = async (runtime: number) => {
    // [FIX] 4. Use 'user.id' from props, do not fetch 'any' user from DB
    if (!currentQ || !userProgress) return;
    if (userProgress.solved_ids.includes(currentQ.id)) return;

    const newTotalScore = userProgress.total_score + currentQ.score_value;
    const newTotalCount = userProgress.total_count + 1;

    const newTopicCounts = { ...userProgress.topic_counts };
    newTopicCounts[currentQ.topic] = (newTopicCounts[currentQ.topic] || 0) + 1;

    const newLevelCounts = { ...userProgress.level_counts };
    newLevelCounts[currentQ.difficulty] = (newLevelCounts[currentQ.difficulty] || 0) + 1;

    const newSolvedIds = [...userProgress.solved_ids, currentQ.id];

    checkRewardMilestones(userProgress.total_score, newTotalScore);

    const updatedProgress = {
        user_id: user.id, // <--- DIRECT LINK TO LOGGED-IN USER
        total_score: newTotalScore,
        total_count: newTotalCount,
        level_counts: newLevelCounts,
        topic_counts: newTopicCounts,
        solved_ids: newSolvedIds
    };

    setUserProgress(updatedProgress as UserProgress);
    await supabase.from('user_progress').upsert(updatedProgress);
  };

  const checkRewardMilestones = (oldScore: number, newScore: number) => {
      const milestones = [
          { val: 100, title: "Bronze Achieved!", msg: "You've crossed 100 XP!" },
          { val: 500, title: "Silver Achieved!", msg: "You've crossed 500 XP!" },
          { val: 1000, title: "Gold Achieved!", msg: "Legendary! 1000 XP reached!" }
      ];
      for (const m of milestones) {
          if (oldScore < m.val && newScore >= m.val) {
              setShowReward({ title: m.title, msg: m.msg });
              setTimeout(() => setShowReward(null), 5000);
          }
      }
  };

  const getDifficultyColor = (diff: string) => {
      switch (diff) {
          case 'very_easy': return 'text-slate-600 bg-slate-100 border-slate-200';
          case 'easy': return 'text-green-600 bg-green-50 border-green-200';
          case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
          case 'hard': return 'text-red-600 bg-red-50 border-red-200';
          case 'challenge': return 'text-purple-600 bg-purple-50 border-purple-200 animate-pulse';
          default: return 'text-slate-600';
      }
  };

  const isSolved = currentQ && userProgress?.solved_ids.includes(currentQ.id);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in relative">

       {showReward && (
           <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
               <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-6 py-4 rounded-xl shadow-xl flex items-center gap-4">
                   <Trophy className="w-8 h-8 text-yellow-600" />
                   <div>
                       <h3 className="font-bold text-lg">{showReward.title}</h3>
                       <p className="text-sm">{showReward.msg}</p>
                   </div>
               </div>
           </div>
       )}

       {isTimedOut && (
           <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
               <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm animate-bounce">
                   <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                       <XCircle className="w-8 h-8 text-red-600" />
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-2">Time's Up!</h2>
                   <p className="text-slate-600 mb-6">You ran out of time for this Challenge. Try another task!</p>
                   <Button onClick={() => fetchRandomQuestion('all')} fullWidth>
                       Roll New Question
                   </Button>
               </div>
           </div>
       )}

       <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Practice Arena</h1>
            <p className="text-slate-600">Pure Python Grammar Drills</p>
          </div>
          <div className="flex gap-6 items-center">
             <div className="flex gap-2">
                 {(userProgress?.total_score || 0) >= 100 && <Award className="w-6 h-6 text-orange-400" title="Bronze" />}
                 {(userProgress?.total_score || 0) >= 500 && <Medal className="w-6 h-6 text-slate-400" title="Silver" />}
                 {(userProgress?.total_score || 0) >= 1000 && <Trophy className="w-6 h-6 text-yellow-500" title="Gold" />}
             </div>

             <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 flex flex-col items-end">
                <span className="text-xs text-slate-500 font-bold uppercase">Total XP</span>
                <span className="font-mono text-blue-600 font-bold text-lg">{userProgress?.total_score || 0}</span>
             </div>
          </div>
       </header>

       <div className="flex gap-4">
        <select
          className="rounded-lg border-slate-300 text-sm focus:ring-blue-500 min-w-[150px]"
          value={selectedTopic}
          onChange={(e) => { setSelectedTopic(e.target.value); fetchRandomQuestion(e.target.value); }}
        >
          <option value="all">All Topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <Button
            variant="ghost"
            onClick={() => fetchRandomQuestion(selectedTopic)}
            size="sm"
            disabled={isLoadingQ}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingQ ? 'animate-spin' : ''}`} />
          {isLoadingQ ? 'Rolling...' : 'Roll New Task'}
        </Button>
      </div>

       <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-[500px]">

          {/* LEFT: Problem Description */}
          <div className="flex flex-col gap-4">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 relative overflow-hidden">
                {currentQ ? (
                    <>
                        {timeLeft !== null && (
                            <div className={`absolute top-0 right-0 p-4 flex items-center font-mono font-bold text-lg ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                                <Timer className="w-5 h-5 mr-2" />
                                {formatTime(timeLeft)}
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4 pr-20">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(currentQ.difficulty)}`}>
                                {currentQ.difficulty.replace('_', ' ').toUpperCase()} ({currentQ.score_value} XP)
                            </span>
                            <div className="flex gap-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">
                                    {currentQ.topic}
                                </span>
                                {isSolved && (
                                    <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Solved
                                    </span>
                                )}
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 mb-2">{currentQ.title}</h2>
                        <p className="text-slate-600 mb-6">{currentQ.description}</p>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">IO Specification</div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">Input Mode:</span>
                                    <code className="ml-2 font-bold text-slate-700">{currentQ.input_mode}</code>
                                </div>
                                <div>
                                    <span className="text-slate-500">Validation:</span>
                                    <code className="ml-2 font-bold text-slate-700">Strict Match</code>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        {isLoadingQ ? 'Finding a challenge...' : 'No questions found for this topic.'}
                    </div>
                )}

                {feedback.msg && (
                    <div className={`p-4 rounded-lg border text-sm ${
                        feedback.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        feedback.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                        <div className="font-bold flex items-center gap-2 mb-1">
                            {feedback.status === 'success' ? <Zap className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                            {feedback.msg}
                        </div>
                        {feedback.runtime && <div className="text-xs opacity-75 flex items-center mt-1"><Clock className="w-3 h-3 mr-1"/> {feedback.runtime}ms</div>}
                        {feedback.output && (
                            <pre className="mt-2 bg-white/50 p-2 rounded text-xs font-mono whitespace-pre-wrap">{feedback.output}</pre>
                        )}
                    </div>
                )}
             </div>
          </div>

          {/* RIGHT: Code Editor */}
          <div className="flex flex-col gap-3">
              <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
                  <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                      <span className="text-xs font-mono text-slate-400">main.py</span>
                      <button
                        onClick={() => setShowSolution(!showSolution)}
                        disabled={!currentQ || (attempts < 3 && !isSolved)}
                        className={`text-xs flex items-center gap-1 ${!currentQ || (attempts >= 3 || isSolved) ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-600 cursor-not-allowed'}`}
                      >
                          {showSolution ? <Unlock className="w-3 h-3"/> : <Lock className="w-3 h-3"/>}
                          {showSolution ? 'Hide Solution' : 'Reference Solution'}
                      </button>
                  </div>

                  {showSolution && currentQ ? (
                      <div className="flex-1 p-4 bg-slate-900/50 text-yellow-100/80 font-mono text-sm whitespace-pre">
                          {currentQ.solution_code}
                      </div>
                  ) : (
                      <textarea
                        className="flex-1 w-full bg-transparent p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        spellCheck={false}
                        disabled={!currentQ || isTimedOut}
                      />
                  )}
              </div>

              <Button
                fullWidth
                onClick={runCode}
                disabled={!isEngineReady || !currentQ || isTimedOut}
                isLoading={!isEngineReady || (feedback.status === 'idle' && feedback.msg !== '')}
              >
                  {!isEngineReady ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> {engineStatus}</>
                  ) : (
                      <><Play className="w-4 h-4 mr-2" /> Run & Grade</>
                  )}
              </Button>
          </div>

       </div>
    </div>
  );
};