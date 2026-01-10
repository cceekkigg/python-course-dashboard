import React, { useState, useEffect } from 'react';
import { supabase } from '../../data/supabaseClient';
import { StudentRecord } from '../../types';
import { Lock, Play, Check, BrainCircuit, AlertCircle, ArrowRight, ClipboardCheck, CalendarRange, Bug, ShieldCheck } from 'lucide-react';
import { ExercisePanel } from './ExercisePanel';
import { HomeworkPanel } from './HomeworkPanel';
import { AssignmentWithStatus } from './AssignmentUtils';

interface AssignmentsPanelProps {
  user: StudentRecord;
  onComplete?: (assignmentId: string, score: number) => void;
}

export const AssignmentsPanel: React.FC<AssignmentsPanelProps> = ({ user, onComplete }) => {
  const [view, setView] = useState<'calendar' | 'detail'>('calendar');
  const [assignmentsMap, setAssignmentsMap] = useState<Record<number, AssignmentWithStatus[]>>({});
  const [preAssessment, setPreAssessment] = useState<AssignmentWithStatus | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDateStr, setStartDateStr] = useState<string>(new Date().toISOString());
  const loadData = async () => {
    setLoading(true);
    try {
        const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'course_start_date').single();
        const currentStartDate = settings?.value || new Date().toISOString();
        setStartDateStr(currentStartDate);

        const { data: contentData } = await supabase.from('content_assignments').select('*');
        let progressMap: Record<string, { status: string; score: number }> = {};
        if (user.assignmentScores) {
             Object.entries(user.assignmentScores).forEach(([id, score]) => {
                 progressMap[id] = { status: 'submitted', score: score };
             });
        }
        if (user.role !== 'guest') {
             const { data: progressData } = await supabase.from('user_assignment_progress').select('assignment_id, status, score').eq('user_id', user.id);
             progressData?.forEach((p: any) => { progressMap[p.assignment_id] = { status: p.status, score: p.score }; });
        }

        const start = new Date(currentStartDate);
        const tempMap: Record<number, AssignmentWithStatus[]> = {};
        let foundPreTest: AssignmentWithStatus | null = null;

        // [UPDATED] AUTHORITY LOGIC
        // 1. Admin: Highest authority, sees everything unlocked.
        // 2. Tester: QA role, sees everything unlocked to test bugs.
        const isPrivileged = user.role === 'admin' || user.role === 'tester';

        (contentData || []).forEach((item: any) => {
           const releaseDate = new Date(start);
           releaseDate.setDate(releaseDate.getDate() + (item.day_index || 0));

           // Standard Lock Rules
           const isDbLocked = item.is_locked === true;
           // [FIXED] Guest Lock: Now locks if index > 1 (Since Day 1 is index 1)
           const isGuestLocked = user.role === 'guest' && (item.day_index || 0) > 1;

           // [UPDATED] Final Decision: Privileged users override ALL locks
           const finalLocked = isPrivileged ? false : (isDbLocked || isGuestLocked);

           const enriched: AssignmentWithStatus = {
              ...item,
              date: releaseDate.toISOString().split('T')[0],
              questions: item.questions || [],
              user_status: progressMap[item.id]?.status as any || 'in_progress',
              user_score: progressMap[item.id]?.score || 0,
              is_locked: finalLocked
           };

           // [FIXED] Pre-test detection: Now checks for EXACTLY 0 (Previously < 0)
           if ((item.day_index || 0) === 0) {
               foundPreTest = enriched;
           } else {
               const idx = item.day_index || 0;
               if (!tempMap[idx]) tempMap[idx] = [];
               tempMap[idx].push(enriched);
           }
        });
        Object.values(tempMap).forEach(dayList => {
            dayList.sort((a, b) => (a.type === 'exercise' ? -1 : 1));
        });
        setAssignmentsMap(tempMap);
        setPreAssessment(foundPreTest);

    } catch (err) {
        console.error("Failed to load assignments:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);
  const handleOpen = (assignment: AssignmentWithStatus) => { setSelectedAssignment(assignment); setView('detail'); };
  const handleBack = async () => { await loadData(); setSelectedAssignment(null); setView('calendar'); };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading Assignments...</div>;
  if (view === 'detail' && selectedAssignment) {
      return selectedAssignment.type === 'homework'
        ? <HomeworkPanel user={user} assignment={selectedAssignment} onBack={handleBack} onComplete={onComplete} />
        : <ExercisePanel user={user} assignment={selectedAssignment} onBack={handleBack} />;
  }

  const totalCourseDays = 15;
  const daysPerWeek = 5;
  const totalWeeks = Math.ceil(totalCourseDays / daysPerWeek);
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i);
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-600">Complete daily exercises to unlock progress.</p>
        </div>

        {/* [UPDATED] Status Badges for Roles */}
        <div className="flex gap-2">
            {user.role === 'guest' && (
               <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg border border-yellow-200">
                   <Lock className="w-4 h-4" /> <span className="text-xs font-bold">Demo Mode</span>
               </div>
            )}
            {user.role === 'tester' && (
               <div className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200">
                   <Bug className="w-4 h-4" /> <span className="text-xs font-bold">Tester Mode: Unlocked</span>
               </div>
            )}
            {user.role === 'admin' && (
               <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
                   <ShieldCheck className="w-4 h-4" /> <span className="text-xs font-bold">Admin Access</span>
               </div>
            )}
        </div>
      </header>

      {/* 1. PRE-WEEK TEST UI BLOCK */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
                      <BrainCircuit className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                              Pre-Course
                          </span>
                          {preAssessment?.user_status === 'submitted' && (
                              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                  <ClipboardCheck className="w-3 h-3" /> Completed
                              </span>
                          )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">
                          {preAssessment ? preAssessment.title : "Knowledge Check: Python Basics"}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1 max-w-xl">
                          {preAssessment
                            ? preAssessment.description
                            : "Assess your current programming level before starting Week 1."}
                      </p>
                  </div>
              </div>

              <div className="shrink-0">
                  {preAssessment ?
                  (
                      <button
                        onClick={() => handleOpen(preAssessment)}
                        disabled={preAssessment.is_locked}
                        className={`flex items-center gap-3 px-5 py-3 rounded-lg font-bold transition-all shadow-sm ${
                            preAssessment.user_status === 'submitted'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                        }`}
                      >
                         {preAssessment.user_status === 'submitted' ? (
                             <>
                                <div className="flex flex-col items-end leading-none">
                                    <span className="text-[10px] uppercase text-slate-500">Score</span>
                                    <span className="text-lg">{preAssessment.user_score} / {preAssessment.max_score || 100}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                             </>
                         ) : (
                             <><span>Start Assessment</span><Play className="w-4 h-4 fill-current" /></>
                         )}
                      </button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-400 italic bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                        <AlertCircle className="w-4 h-4" /> Unavailable
                    </div>
                  )}
              </div>
          </div>
      </div>

      <div className="border-t border-slate-100 my-4"></div>

      {/* 2. WEEKLY BLOCKS */}
      <div className="space-y-8">
        {weeks.map((weekNum) => {
           // [FIXED] Calendar Rendering: Start from 1. (Week 0 -> StartDay 1)
           const weekStartDay = weekNum * daysPerWeek + 1;
           const weekDays = Array.from({ length: daysPerWeek }, (_, i) => weekStartDay + i);
           const colors = [
               { accent: 'bg-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-blue-100' },
               { accent: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100' },
               { accent: 'bg-purple-500', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', border: 'border-purple-100' }
           ];
           const theme = colors[weekNum % colors.length];

           // Visual logic: Week is visually locked if Guest tries to access week > 0
           const isWeekLocked = user.role === 'guest' && weekNum > 0;
           return (
               <div key={weekNum} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative transition-all ${isWeekLocked ? 'opacity-75' : ''}`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isWeekLocked ? 'bg-slate-300' : theme.accent}`}></div>

                  <div className="p-6 pb-2 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isWeekLocked ? 'bg-slate-100 border-slate-200 text-slate-400' : `${theme.iconBg} ${theme.border} ${theme.iconColor}`}`}>
                          {isWeekLocked ? <Lock className="w-5 h-5" /> : <CalendarRange className="w-5 h-5" />}
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              Week {weekNum + 1}
                              {isWeekLocked && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">Locked</span>}
                          </h3>
                          <p className="text-sm text-slate-500">Core Concepts & Applications • Days {weekStartDay}-{weekStartDay + 4}</p>
                      </div>
                   </div>

                  <div className="p-6 pt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                    {weekDays.map((dayIndex) => {
                      // [FIXED] Date Calculation: Offset by -1 since dayIndex is now 1-based
                      const weeksPassed = Math.floor((dayIndex - 1) / 5);
                      const date = new Date(startDateStr);
                      date.setDate(date.getDate() + (dayIndex - 1) + (weeksPassed * 2));

                      const dayAssignments = assignmentsMap[dayIndex] || [];
                      // Visually lock the box only if items inside are effectively locked
                      const isBoxLocked = dayAssignments.length > 0 && dayAssignments.every(a => a.is_locked);
                      return (
                        <div key={dayIndex} className={`min-h-[140px] rounded-xl border p-3 flex flex-col transition-all hover:shadow-sm ${isBoxLocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-3">
                             <div className="text-xs font-bold text-slate-500">
                                {/* [FIXED] Label: Use dayIndex directly as it is now 1..15 */}
                                <span className="text-slate-400 font-normal">Day {dayIndex}</span>
                                <br/>
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                             </div>
                             {isBoxLocked && <Lock className="w-4 h-4 text-slate-300" />}
                          </div>

                          <div className="space-y-2 flex-1">
                             {dayAssignments.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-slate-300 italic">No content</div>
                             ) : (
                               dayAssignments.map(assign => {
                                   const isDone = assign.user_status === 'submitted';
                                   const isHW = assign.type === 'homework';
                                   let btnClass = "w-full text-left text-xs p-2 rounded border flex items-center justify-between transition-all ";
                                   if (assign.is_locked) {
                                       btnClass += "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200";
                                   } else if (isDone) {
                                       btnClass += isHW ? "bg-purple-100 border-purple-200 text-purple-800" : "bg-green-100 border-green-200 text-green-800 font-medium";
                                   } else {
                                       btnClass += isHW ? "bg-white border-purple-100 text-purple-700 hover:border-purple-300" : "bg-white border-blue-200 text-blue-700 hover:border-blue-400 shadow-sm";
                                   }

                                   return (
                                     <button key={assign.id} disabled={assign.is_locked} onClick={() => handleOpen(assign)} className={btnClass}>
                                         <span className="truncate flex items-center">
                                            {isDone ? <Check className="w-3 h-3 mr-1.5" /> : null}
                                            {isHW ? 'HW' : 'EX'}
                                         </span>
                                         {!assign.is_locked && !isDone && <Play className="w-3 h-3 opacity-50" />}
                                         {isDone && isHW && <span className="text-[11px] shadow-sm">{assign.user_score} PTS</span>}
                                     </button>
                                  );
                               })
                             )}
                          </div>
                        </div>
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