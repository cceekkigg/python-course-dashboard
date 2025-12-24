import React, { useState } from 'react';
import { COURSE_START_DATE, ASSIGNMENTS_DB } from '../../data/mockData';
import { Assignment, NotebookCell, StudentRecord } from '../../types';
import Button from '../../components/Button';
import { Lock, Check, ChevronLeft, Play, Save, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';

// Helpers to generate calendar days
const getCourseDays = () => {
  const days = [];
  let current = new Date(COURSE_START_DATE);
  for (let i = 0; i < 21; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

// Real date used for logic as requested
const CURRENT_DATE = new Date(); 

interface AssignmentsPanelProps {
  user: StudentRecord;
  onComplete?: (assignmentId: string, score: number) => void;
}

export const AssignmentsPanel: React.FC<AssignmentsPanelProps> = ({ user, onComplete }) => {
  const [view, setView] = useState<'calendar' | 'detail'>('calendar');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // State
  const [notebookAnswers, setNotebookAnswers] = useState<Record<string, string>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, { output: string, success: boolean }>>({});
  const [preCheckResults, setPreCheckResults] = useState<Record<string, { passed: number, total: number, details: boolean[] }>>({});

  // Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const days = getCourseDays();

  // Helper to check submission status
  const isSubmitted = (assignmentId: string) => {
    return user.assignmentScores && user.assignmentScores[assignmentId] !== undefined;
  };

  const handleOpenAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    
    // If submitted, load standard answer or user's answer (here just standard/mock since we don't save user text yet in this MVP)
    const initialAnswers: Record<string, string> = {};
    assignment.questions.filter(q => q.type === 'code').forEach(q => {
       initialAnswers[q.id] = q.content; // In a real app, load user's saved code
    });
    setNotebookAnswers(initialAnswers);
    
    // Reset states
    setExecutionResults({});
    setPreCheckResults({});
    setShowSubmitModal(false);
    setView('detail');
  };

  const handleCodeChange = (id: string, val: string) => {
    setNotebookAnswers(prev => ({...prev, [id]: val}));
  }

  // MOCK EXECUTION FOR EXERCISES
  const runCell = (cell: NotebookCell) => {
    const code = notebookAnswers[cell.id] || "";
    const expected = cell.expectedOutput || "";
    
    let output = "";
    let success = false;

    // Simulating success logic for Exercise
    if (code.includes(expected) || code.includes("print")) {
        output = expected; 
        success = true;
    } else {
        output = "SyntaxError: Unexpected token..."; 
        success = false;
    }

    setExecutionResults(prev => ({
        ...prev,
        [cell.id]: { output, success }
    }));
  };

  // Check if all cells in Exercise are successful
  const isExerciseComplete = () => {
    if (!selectedAssignment) return false;
    const codeCells = selectedAssignment.questions.filter(q => q.type === 'code');
    return codeCells.every(cell => executionResults[cell.id]?.success);
  };

  const handleSaveExerciseStatus = () => {
      if (!selectedAssignment || !onComplete) return;
      onComplete(selectedAssignment.id, 100); 
      alert("Exercise Saved and Completed!");
      setView('calendar');
  };

  // PRE-CHECK FOR HOMEWORK
  const runPreCheck = () => {
    if (!selectedAssignment) return;

    const results: Record<string, any> = {};

    selectedAssignment.questions.forEach(q => {
        if (q.type === 'code' && q.testCases) {
            const code = notebookAnswers[q.id];
            // Mock logic: pass if code not empty and contains "return"
            const checks = q.testCases.map(tc => {
                if (!code || !code.includes("return")) return false;
                return true; 
            });

            results[q.id] = {
                passed: checks.filter(Boolean).length,
                total: checks.length,
                details: checks
            };
        }
    });

    setPreCheckResults(results);
  };

  const handleSubmitHomework = () => {
      if (!selectedAssignment || !onComplete) return;
      // Assume perfect score for demo upon submission
      onComplete(selectedAssignment.id, selectedAssignment.maxScore);
      setShowSubmitModal(false);
      setView('calendar');
  };

  // CALENDAR VIEW
  if (view === 'calendar') {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
           <div>
            <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
            <p className="text-slate-600">Weekly exercises and homework.</p>
           </div>
           <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
             Date: {CURRENT_DATE.toLocaleDateString()}
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {days.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const dayAssignments = ASSIGNMENTS_DB[dateStr] || [];
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            // Logic: Unlock if day <= CURRENT_DATE (ignoring time)
            const unlockDate = new Date(day);
            unlockDate.setHours(0,0,0,0);
            const today = new Date(CURRENT_DATE);
            today.setHours(0,0,0,0);
            
            const isLocked = unlockDate > today;

            return (
              <div key={idx} className={`min-h-[120px] rounded-xl border p-3 flex flex-col ${isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                <div className="text-xs font-bold text-slate-500 mb-2">
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} <br/>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                
                <div className="space-y-2 flex-1">
                  {dayAssignments.map(assign => {
                     // Check if completed
                     const completed = isSubmitted(assign.id);
                     const isHomework = assign.type === 'homework';
                     
                     return (
                      <button
                        key={assign.id}
                        disabled={isLocked}
                        onClick={() => !isLocked && handleOpenAssignment(assign)}
                        className={`w-full text-left text-xs p-2 rounded border flex items-center justify-between group transition-all
                          ${completed 
                            ? (isHomework ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-blue-100 border-blue-300 text-blue-800')
                            : (isHomework ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-blue-200 bg-blue-50 text-blue-700')
                          }
                          ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-md'}
                        `}
                      >
                        <span className="font-semibold truncate flex items-center">
                            {completed && <Check className="w-3 h-3 mr-1" />}
                            {isHomework ? 'HW' : 'EX'}
                        </span>
                        {isLocked ? <Lock className="w-3 h-3" /> : <Play className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (!selectedAssignment) return null;

  const isHomework = selectedAssignment.type === 'homework';
  const exerciseReadyToSave = !isHomework && isExerciseComplete();
  const submitted = isSubmitted(selectedAssignment.id);
  const earnedScore = submitted ? (user.assignmentScores[selectedAssignment.id] || 0) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10 pt-2">
        <Button variant="ghost" onClick={() => setView('calendar')}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${isHomework ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {selectedAssignment?.type}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{selectedAssignment?.title}</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
              {isHomework ? `Max Score: ${selectedAssignment?.maxScore}` : 'Practice Mode (No Submission)'}
          </p>
        </div>
        
        <div className="ml-auto flex gap-2">
            {submitted ? (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold flex items-center border border-green-200">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Review Mode: {earnedScore}/{selectedAssignment.maxScore || 100}
                </div>
            ) : (
                isHomework ? (
                    <>
                        <Button variant="secondary" onClick={runPreCheck}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Pre-Check
                        </Button>
                        <Button variant="primary" onClick={() => setShowSubmitModal(true)}>
                            <Save className="mr-2 h-4 w-4" /> Submit
                        </Button>
                    </>
                ) : (
                    <Button 
                        variant={exerciseReadyToSave ? 'primary' : 'outline'} 
                        onClick={handleSaveExerciseStatus}
                        disabled={!exerciseReadyToSave}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" /> 
                        {exerciseReadyToSave ? 'Save & Complete' : 'Complete All Tasks'}
                    </Button>
                )
            )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="p-4 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
           <h3 className="font-bold mb-1">Instructions</h3>
           <p className="text-slate-600">{selectedAssignment?.description}</p>
        </div>
        
        {/* Explanation for Homework Buttons */}
        {isHomework && !submitted && (
             <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-slate-400" />
                <span>
                    Use <strong>Pre-Check</strong> to run the auto-grader tests against your code. 
                    Once all tests pass, click <strong>Submit</strong> to finalize your score.
                </span>
             </div>
        )}

        {selectedAssignment?.questions.map((cell, idx) => (
          <div key={cell.id} className="space-y-2 group">
            <div className="flex gap-2">
               <div className="w-12 text-right font-mono text-xs text-slate-400 pt-3 select-none">
                 [{idx+1}]
               </div>
               
               <div className="flex-1 space-y-3">
                 {/* Question Content */}
                 {cell.type === 'markdown' && (
                   <div className="prose prose-sm max-w-none p-4 bg-transparent border-l-4 border-blue-200 pl-4">
                      <pre className="whitespace-pre-wrap font-sans text-slate-800">{cell.content}</pre>
                   </div>
                 )}

                 {/* Code Editor */}
                 {cell.type === 'code' && (
                   <div className="space-y-2">
                        {!submitted ? (
                            /* Active Editor */
                            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 ring-blue-500/50 bg-white">
                                <div className="bg-slate-50 px-3 py-1 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-mono">input</span>
                                    {!isHomework && (
                                        <button onClick={() => runCell(cell)} className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium">
                                            <Play className="w-3 h-3 mr-1" /> Run
                                        </button>
                                    )}
                                </div>
                                <textarea
                                className="w-full bg-slate-50 font-mono text-sm p-3 min-h-[120px] resize-y focus:outline-none text-slate-800"
                                value={notebookAnswers[cell.id] || ''}
                                onChange={(e) => handleCodeChange(cell.id, e.target.value)}
                                spellCheck={false}
                                />
                            </div>
                        ) : (
                            /* Submitted View (Read Only) */
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm text-slate-600 relative">
                                <div className="absolute top-2 right-2 text-xs bg-slate-200 px-2 py-1 rounded">Read Only</div>
                                <pre>{notebookAnswers[cell.id] || '# No code submitted'}</pre>
                            </div>
                        )}
                        
                        {/* Exercise Mode: Execution Result */}
                        {!isHomework && executionResults[cell.id] && (
                            <div className={`p-3 rounded text-sm font-mono border ${executionResults[cell.id].success ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
                                <div className="text-xs font-bold text-slate-400 mb-1">OUTPUT</div>
                                {executionResults[cell.id].output}
                            </div>
                        )}
                        {!isHomework && cell.expectedOutput && !submitted && (
                             <div className="text-xs text-slate-500 pl-1">
                                Expected: <code className="bg-slate-100 px-1 rounded">{cell.expectedOutput}</code>
                             </div>
                        )}

                        {/* Homework Mode: Test Cases & Pre-Check Result */}
                        {isHomework && (
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 animate-fade-in">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between items-center">
                                   <span>Auto-Grader Report</span>
                                   {submitted && <span className="text-green-600">Score: {earnedScore}%</span>}
                                </h4>
                                
                                <div className="space-y-2">
                                    {/* 
                                      If submitted: Generate 10 mock test cases to show robust grading.
                                      If pre-check: Use the preCheckResults state.
                                    */}
                                    {(submitted ? Array.from({length: 10}) : (cell.testCases || [])).map((_, i) => {
                                        // Mock display for submitted state vs real precheck state
                                        let status = 'pending';
                                        let inputLabel = `Test Case #${i+1}`;
                                        
                                        if (submitted) {
                                            // If submitted and score is high, show passes
                                            status = earnedScore >= 100 ? 'pass' : (i < 5 ? 'pass' : 'fail');
                                            inputLabel = `Check #${i+1}: Validating edge case...`;
                                        } else if (cell.testCases && cell.testCases[i]) {
                                            const result = preCheckResults[cell.id];
                                            status = result ? (result.details[i] ? 'pass' : 'fail') : 'pending';
                                            inputLabel = `Input: ${cell.testCases[i].input}`;
                                        }

                                        if (!submitted && !cell.testCases) return null;

                                        return (
                                            <div key={i} className="flex items-center text-xs font-mono bg-white p-2 rounded border border-slate-100">
                                                <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center
                                                    ${status === 'pass' ? 'bg-green-100 text-green-600' : 
                                                      status === 'fail' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-300'}
                                                `}>
                                                    {status === 'pass' ? <Check className="w-3 h-3"/> : 
                                                     status === 'fail' ? <XCircle className="w-3 h-3"/> : 
                                                     <div className="w-1 h-1 bg-current rounded-full"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-slate-600">{inputLabel}</span>
                                                </div>
                                                <div className="text-right font-bold text-slate-400">
                                                    {status === 'pass' ? 'Passed' : status === 'fail' ? 'Failed' : 'Pending'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                   </div>
                 )}
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                 <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Submission?</h3>
              <p className="text-sm text-slate-600">
                Have you run the <strong>Pre-Check</strong>? <br/>
                This submission is final and will be graded immediately. You cannot undo this action.
              </p>
              <div className="flex gap-3 pt-2">
                 <Button variant="outline" fullWidth onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                 <Button variant="primary" fullWidth onClick={handleSubmitHomework}>Confirm & Submit</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};