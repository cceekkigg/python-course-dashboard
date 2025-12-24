import React, { useState, useEffect, useRef } from 'react';
import { PRACTICE_QUESTIONS, COURSE_WEEKS } from '../../data/mockData';
import Button from '../../components/Button';
import { Play, CheckCircle, RefreshCw, AlertCircle, ArrowRight, Terminal } from 'lucide-react';

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export const PracticePanel: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{status: 'idle' | 'success' | 'error', msg: string, output?: string}>({ status: 'idle', msg: '' });
  const [score, setScore] = useState(0);
  
  // Pyodide State
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const pyodideRef = useRef<any>(null);

  const filteredQuestions = selectedTopic === 'all' 
    ? PRACTICE_QUESTIONS 
    : PRACTICE_QUESTIONS.filter(q => q.topicId === selectedTopic);

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        if (window.loadPyodide && !pyodideRef.current) {
          const pyodide = await window.loadPyodide();
          pyodideRef.current = pyodide;
          setIsPyodideLoading(false);
          console.log("Python Engine Ready");
        }
      } catch (err) {
        console.error("Failed to load Pyodide:", err);
        setFeedback({ status: 'error', msg: 'Failed to load Python engine. Check internet connection.' });
      }
    };
    initPyodide();
  }, []);

  const executePython = async (userCode: string, expectedOutput: string) => {
    if (!pyodideRef.current) return { success: false, output: "Engine not ready." };

    let outputBuffer: string[] = [];
    
    // Configure standard output capture
    pyodideRef.current.setStdout({
      batched: (msg: string) => outputBuffer.push(msg)
    });

    try {
      // Execute the code
      await pyodideRef.current.runPythonAsync(userCode);
      
      const fullOutput = outputBuffer.join('\n').trim();
      const normExpected = expectedOutput.trim();

      // Check success
      // We check if output matches OR if the result of the last expression matches
      const isSuccess = fullOutput === normExpected || fullOutput.includes(normExpected);

      return { success: isSuccess, output: fullOutput || "[No Output]" };

    } catch (err: any) {
      return { success: false, output: `Error: ${err.message}` };
    }
  };

  const handleRunCode = async () => {
    if (!code.trim() || code === currentQuestion.starterCode) {
      setFeedback({ status: 'error', msg: 'Please write some code first!' });
      return;
    }

    if (isPyodideLoading) {
       setFeedback({ status: 'idle', msg: 'Python engine is still loading...' });
       return;
    }

    setFeedback({ status: 'idle', msg: 'Running...' });

    // Use the real engine
    const result = await executePython(code, currentQuestion.expectedOutput);
    
    if (result.success) {
      setFeedback({ 
        status: 'success', 
        msg: 'Correct! The output matches the expected result.', 
        output: result.output 
      });
      // Use the pre-saved points from the question
      setScore(s => s + currentQuestion.points);
    } else {
      setFeedback({ 
        status: 'error', 
        msg: `Incorrect. Expected: "${currentQuestion.expectedOutput}"`, 
        output: result.output 
      });
    }
  };

  const handleNext = () => {
    const nextIndex = (currentQuestionIndex + 1) % filteredQuestions.length;
    setCurrentQuestionIndex(nextIndex);
    setCode(filteredQuestions[nextIndex].starterCode);
    setFeedback({ status: 'idle', msg: '' });
  };

  React.useEffect(() => {
    if (currentQuestion) setCode(currentQuestion.starterCode);
    setFeedback({ status: 'idle', msg: '' });
  }, [currentQuestion]);

  if (!currentQuestion) return <div>No questions available.</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Practice Arena</h1>
          <p className="text-slate-600">Sharpen your skills with <span className="text-blue-600 font-semibold">Live Python Execution</span>.</p>
        </div>
        <div className="flex gap-3 items-center">
           {isPyodideLoading && (
             <span className="text-xs text-slate-500 animate-pulse flex items-center">
                <Terminal className="w-3 h-3 mr-1" /> Engine Loading...
             </span>
           )}
           <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
             <span className="text-sm text-yellow-800 font-bold">XP Score: {score}</span>
           </div>
        </div>
      </header>

      {/* Controls */}
      <div className="flex gap-4">
        <select 
          className="rounded-lg border-slate-300 text-sm focus:ring-blue-500"
          value={selectedTopic}
          onChange={(e) => { setSelectedTopic(e.target.value); setCurrentQuestionIndex(0); }}
        >
          <option value="all">All Topics</option>
          {COURSE_WEEKS.map(w => <option key={w.id} value={w.id}>Week {w.weekNumber}: {w.title}</option>)}
        </select>
        <Button variant="ghost" onClick={handleNext} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Skip Question
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Question Side */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
           <div className="flex justify-between mb-4">
             <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
               currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
               currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
               'bg-red-100 text-red-700'
             }`}>
               {currentQuestion.difficulty}
             </span>
             <span className="text-xs text-slate-500 font-bold">{currentQuestion.points} pts</span>
           </div>
           
           <h3 className="font-bold text-lg mb-4">{currentQuestion.question}</h3>
           
           <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mb-4">
             <div className="text-xs text-slate-500 font-bold uppercase mb-1">Expected Output</div>
             <div className="font-mono text-sm text-slate-800">{currentQuestion.expectedOutput}</div>
           </div>

           <div className="flex-1"></div>
           
           {feedback.msg && (
             <div className={`mt-4 p-4 rounded-lg text-sm border animate-fade-in ${
               feedback.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
               feedback.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
               'bg-blue-50 border-blue-200 text-blue-800'
             }`}>
                <div className="font-bold flex items-center mb-1">
                  {feedback.status === 'success' ? <CheckCircle className="w-4 h-4 mr-2"/> : 
                   feedback.status === 'error' ? <AlertCircle className="w-4 h-4 mr-2"/> : null}
                  {feedback.status === 'idle' ? 'Executing...' : feedback.status === 'success' ? 'Passed' : 'Failed'}
                </div>
                <div>{feedback.msg}</div>
                {feedback.output && (
                  <div className="mt-2 text-xs font-mono bg-white/50 p-2 rounded">
                    Output: <br/>
                    <pre className="whitespace-pre-wrap">{feedback.output}</pre>
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Code Editor Side */}
        <div className="flex flex-col gap-2">
          <div className="flex-1 relative rounded-xl border border-slate-300 overflow-hidden bg-slate-900 text-slate-100 font-mono text-sm">
             <div className="absolute top-0 left-0 w-full bg-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between">
                <span>main.py</span>
                {/* Simplified header as requested */}
                <span>Editor</span>
             </div>
             <textarea 
               className="w-full h-full p-4 pt-10 bg-transparent resize-none focus:outline-none"
               value={code}
               onChange={(e) => setCode(e.target.value)}
               spellCheck={false}
               disabled={isPyodideLoading}
             />
          </div>
          
          <div className="flex gap-2">
            <Button 
                variant="primary" 
                fullWidth={feedback.status !== 'success'}
                onClick={handleRunCode} 
                isLoading={feedback.status === 'idle' && feedback.msg === 'Running...'}
                disabled={isPyodideLoading}
                className={feedback.status === 'success' ? 'w-2/3' : 'w-full'}
            >
                <Play className="mr-2 h-4 w-4" /> {isPyodideLoading ? 'Initializing...' : 'Run Code'}
            </Button>

            {feedback.status === 'success' && (
                <Button variant="secondary" className="w-1/3 bg-green-600 hover:bg-green-700 border-none" onClick={handleNext}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};