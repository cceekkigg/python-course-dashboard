// ==============================================================================
// FILE PATH: views/panels/AssignmentsPanel.tsx
// ==============================================================================

import React, { useState } from 'react';
import { Assignment, NotebookCell, StudentRecord } from '../../types';
import { COURSE_START_DATE, ASSIGNMENTS_DB } from '../../data/mockData';
import Button from '../../components/Button';
import { Lock, Check, ChevronLeft, Play, Save, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const CURRENT_DATE = new Date(); // Mock "Today"

interface AssignmentsPanelProps {
  user: StudentRecord;
  onComplete?: (assignmentId: string, score: number) => void;
}

export const AssignmentsPanel: React.FC<AssignmentsPanelProps> = ({ user, onComplete }) => {
  const [view, setView] = useState<'calendar' | 'detail'>('calendar');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const handleOpenAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedAssignment(null);
    setView('calendar');
  };

  return view === 'calendar' ? (
    <CalendarView
      user={user}
      onSelect={handleOpenAssignment}
    />
  ) : (
    <DetailView
      user={user}
      assignment={selectedAssignment!}
      onBack={handleBack}
      onComplete={(id, score) => {
        onComplete?.(id, score);
        handleBack();
      }}
    />
  );
};

// ============================================================================
// SUB-COMPONENT: Calendar View
// ============================================================================

const CalendarView: React.FC<{ user: StudentRecord; onSelect: (a: Assignment) => void }> = ({ user, onSelect }) => {
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(COURSE_START_DATE);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isGuest = user.role === 'guest';

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
          const assignments = ASSIGNMENTS_DB[dateStr] || [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          // Locking Logic
          const unlockDate = new Date(day);
          unlockDate.setHours(0, 0, 0, 0);
          const today = new Date(CURRENT_DATE);
          today.setHours(0, 0, 0, 0);

          const isDateLocked = unlockDate > today;
          const isGuestLocked = isGuest && idx > 0;
          const isLocked = isDateLocked || isGuestLocked;

          return (
            <div key={idx} className={`min-h-[120px] rounded-xl border p-3 flex flex-col ${isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-500 mb-2">
                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} <br />
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>

              <div className="space-y-2 flex-1">
                {assignments.map(assign => {
                  const completed = user.assignmentScores?.[assign.id] !== undefined;
                  const isHomework = assign.type === 'homework';

                  return (
                    <button
                      key={assign.id}
                      disabled={isLocked}
                      onClick={() => !isLocked && onSelect(assign)}
                      className={`w-full text-left text-xs p-2 rounded border flex items-center justify-between group transition-all
                        ${completed
                          ? (isHomework ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-blue-100 border-blue-300 text-blue-800')
                          : (isHomework ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-blue-200 bg-blue-50 text-blue-700')
                        }
                        ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-md'}
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold truncate flex items-center">
                          {completed && <Check className="w-3 h-3 mr-1" />}
                          {isHomework ? 'HW' : 'EX'}
                        </span>
                        {isGuestLocked && (
                          <span className="text-[9px] uppercase tracking-wide opacity-70 block mt-0.5">Full Course Only</span>
                        )}
                      </div>
                      {isLocked ?
                        <Lock className="w-3 h-3 flex-shrink-0 ml-1" /> :
                        <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1" />
                      }
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
};

// ============================================================================
// SUB-COMPONENT: Detail View (The Assignment Runner)
// ============================================================================

interface DetailViewProps {
  user: StudentRecord;
  assignment: Assignment;
  onBack: () => void;
  onComplete: (id: string, score: number) => void;
}

const DetailView: React.FC<DetailViewProps> = ({ user, assignment, onBack, onComplete }) => {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    assignment.questions.filter(q => q.type === 'code').forEach(q => initial[q.id] = q.content);
    return initial;
  });

  const [execResults, setExecResults] = useState<Record<string, { output: string; success: boolean }>>({});
  const [preCheckResults, setPreCheckResults] = useState<Record<string, { passed: number; details: boolean[] }>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isSubmitted = user.assignmentScores?.[assignment.id] !== undefined;
  const earnedScore = user.assignmentScores?.[assignment.id] || 0;
  const isHomework = assignment.type === 'homework';

  // --- Logic Helpers ---

  const handleCodeChange = (id: string, val: string) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
  };

  const runCell = (cell: NotebookCell) => {
    const code = answers[cell.id] || "";
    const expected = cell.expectedOutput || "";
    const success = code.includes(expected) || code.includes("print");
    const output = success ? expected : "SyntaxError: Unexpected token...";
    setExecResults(prev => ({ ...prev, [cell.id]: { output, success } }));
  };

  const runPreCheck = () => {
    const results: Record<string, any> = {};
    assignment.questions.forEach(q => {
      if (q.type === 'code' && q.testCases) {
        const code = answers[q.id];
        const checks = q.testCases.map(() => code && code.includes("return"));
        results[q.id] = { passed: checks.filter(Boolean).length, details: checks };
      }
    });
    setPreCheckResults(results);
  };

  const isExerciseComplete = () => {
    const codeCells = assignment.questions.filter(q => q.type === 'code');
    return codeCells.every(cell => execResults[cell.id]?.success);
  };

  const handleSaveExercise = () => {
    alert("Exercise Saved and Completed!");
    onComplete(assignment.id, 100);
  };

  const handleSubmitHomework = () => {
    onComplete(assignment.id, assignment.maxScore);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${isHomework ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {assignment.type}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {isHomework ? `Max Score: ${assignment.maxScore}` : 'Practice Mode (No Submission)'}
          </p>
        </div>
        <div className="ml-auto">
          {isSubmitted ? (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold flex items-center border border-green-200">
              <CheckCircle className="w-5 h-5 mr-2" /> Review Mode: {earnedScore}/{assignment.maxScore || 100}
            </div>
          ) : isHomework ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={runPreCheck}><CheckCircle className="mr-2 h-4 w-4" /> Pre-Check</Button>
              <Button variant="primary" onClick={() => setShowConfirmModal(true)}><Save className="mr-2 h-4 w-4" /> Submit</Button>
            </div>
          ) : (
            <Button variant={isExerciseComplete() ? 'primary' : 'outline'} onClick={handleSaveExercise} disabled={!isExerciseComplete()}>
              <CheckCircle className="mr-2 h-4 w-4" /> {isExerciseComplete() ? 'Save & Complete' : 'Complete All Tasks'}
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="p-4 bg-white border border-slate-200 rounded-lg text-sm shadow-sm">
          <h3 className="font-bold mb-1">Instructions</h3>
          <p className="text-slate-600">{assignment.description}</p>
        </div>

        {assignment.questions.map((cell, idx) => (
          <div key={cell.id} className="flex gap-2">
            <div className="w-12 text-right font-mono text-xs text-slate-400 pt-3 select-none">[{idx + 1}]</div>
            <div className="flex-1 space-y-3">
              {cell.type === 'markdown' ? (
                <div className="prose prose-sm max-w-none p-4 bg-transparent border-l-4 border-blue-200 pl-4">
                  <pre className="whitespace-pre-wrap font-sans text-slate-800">{cell.content}</pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 ring-blue-500/50 bg-white">
                    <div className="bg-slate-50 px-3 py-1 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-mono">input</span>
                      {!isHomework && !isSubmitted && (
                        <button onClick={() => runCell(cell)} className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium">
                          <Play className="w-3 h-3 mr-1" /> Run
                        </button>
                      )}
                    </div>
                    {isSubmitted ? (
                      <div className="bg-slate-50 p-3 font-mono text-sm text-slate-600">
                        <pre>{answers[cell.id] || '# No code submitted'}</pre>
                      </div>
                    ) : (
                      <textarea
                        className="w-full bg-slate-50 font-mono text-sm p-3 min-h-[120px] resize-y focus:outline-none text-slate-800"
                        value={answers[cell.id] || ''}
                        onChange={(e) => handleCodeChange(cell.id, e.target.value)}
                        spellCheck={false}
                      />
                    )}
                  </div>

                  {/* Output & Feedback Section */}
                  {!isHomework && execResults[cell.id] && (
                    <div className={`p-3 rounded text-sm font-mono border ${execResults[cell.id].success ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
                      <div className="text-xs font-bold text-slate-400 mb-1">OUTPUT</div>
                      {execResults[cell.id].output}
                    </div>
                  )}

                  {isHomework && (isSubmitted || preCheckResults[cell.id]) && (
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Auto-Grader Report</h4>
                      <div className="space-y-2">
                        {(cell.testCases || []).map((tc, i) => {
                          let status = 'pending';
                          if (isSubmitted) status = earnedScore >= 100 || i < 5 ? 'pass' : 'fail';
                          else if (preCheckResults[cell.id]) status = preCheckResults[cell.id].details[i] ? 'pass' : 'fail';

                          return (
                            <div key={i} className="flex items-center text-xs font-mono bg-white p-2 rounded border border-slate-100">
                               <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center ${status === 'pass' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                 {status === 'pass' ? <Check className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                               </div>
                               <span className="text-slate-600 flex-1">Test Case #{i+1}</span>
                               <span className="font-bold text-slate-400 capitalize">{status}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                 <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Submission?</h3>
              <p className="text-sm text-slate-600">This submission is final and will be graded immediately.</p>
              <div className="flex gap-3 pt-2">
                 <Button variant="outline" fullWidth onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                 <Button variant="primary" fullWidth onClick={handleSubmitHomework}>Confirm</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};