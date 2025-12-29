import React, { useState, useEffect } from 'react';
import { supabase } from '../../data/supabaseClient';
import { StudentRecord } from '../../types';
import { COURSE_START_DATE } from '../../data/mockData';
import { Lock, Play, Check } from 'lucide-react';

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
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
        // Fetch Assignment Content
        const { data: contentData } = await supabase.from('content_assignments').select('*');

        // Fetch User Progress
        let progressMap: Record<string, { status: string; score: number }> = {};

        // A. Check user prop first (Optimistic UI)
        if (user.assignmentScores) {
             Object.entries(user.assignmentScores).forEach(([id, score]) => {
                 progressMap[id] = { status: 'submitted', score: score };
             });
        }

        // B. Fallback to DB fetch (if user is not guest)
        if (user.role !== 'guest') {
             const { data: progressData } = await supabase.from('user_assignment_progress')
                .select('assignment_id, status, score')
                .eq('user_id', user.id);
             progressData?.forEach((p: any) => {
                 progressMap[p.assignment_id] = { status: p.status, score: p.score };
             });
        }

        const today = new Date();
        const tempMap: Record<number, AssignmentWithStatus[]> = {};

        (contentData || []).forEach((item: any) => {
           const releaseDate = new Date(COURSE_START_DATE);
           releaseDate.setDate(releaseDate.getDate() + item.day_index);

           // Lock Logic: Locked if date is future OR if guest tries to access Day > 1
           const isDateLocked = releaseDate > today;
           const isGuestLocked = user.role === 'guest' && item.day_index > 0;

           const enriched: AssignmentWithStatus = {
              ...item,
              date: releaseDate.toISOString().split('T')[0],
              questions: item.questions || [],
              user_status: progressMap[item.id]?.status as any || 'in_progress',
              user_score: progressMap[item.id]?.score || 0,
              is_locked: isDateLocked || isGuestLocked
           };

           if (!tempMap[item.day_index]) tempMap[item.day_index] = [];
           tempMap[item.day_index].push(enriched);
        });
        setAssignmentsMap(tempMap);
    } catch (err) {
        console.error("Failed to load assignments:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleOpen = (assignment: AssignmentWithStatus) => {
    setSelectedAssignment(assignment);
    setView('detail');
  };

  const handleBack = async () => {
    await loadData(); // Refresh data on back to show updated scores
    setSelectedAssignment(null);
    setView('calendar');
  };

  // 2. RENDERER
  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading Assignments...</div>;

  if (view === 'detail' && selectedAssignment) {
      // --- ROUTER LOGIC ---
      if (selectedAssignment.type === 'homework') {
          return <HomeworkPanel user={user} assignment={selectedAssignment} onBack={handleBack} onComplete={onComplete} />;
      } else {
          return <ExercisePanel user={user} assignment={selectedAssignment} onBack={handleBack} />;
      }
  }

  // 3. CALENDAR VIEW
  const totalCourseDays = 15;
  const courseDays = Array.from({ length: totalCourseDays }, (_, i) => i);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-600">Complete daily exercises to unlock progress.</p>
        </div>
        {user.role === 'guest' && (
           <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg border border-yellow-200">
               <Lock className="w-4 h-4" /> <span className="text-xs font-bold">Demo Access: Day 1 Only</span>
           </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {courseDays.map((dayIndex) => {
          const weeksPassed = Math.floor(dayIndex / 5);
          const date = new Date(COURSE_START_DATE);
          date.setDate(date.getDate() + dayIndex + (weeksPassed * 2));

          const dayAssignments = assignmentsMap[dayIndex] || [];
          // Lock the whole box if it's guest mode > day 1 OR all assignments inside are locked
          const isBoxLocked = (user.role === 'guest' && dayIndex > 0) ||
                              (dayAssignments.length > 0 && dayAssignments.every(a => a.is_locked));

          return (
            <div key={dayIndex} className={`min-h-[140px] rounded-xl border p-3 flex flex-col transition-all hover:shadow-sm ${isBoxLocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-start mb-3">
                 <div className="text-xs font-bold text-slate-500">
                    <span className="text-slate-400 font-normal">Day {dayIndex + 1}</span> <br/>
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
                           btnClass += isHW ? "bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-300" : "bg-white border-blue-200 text-blue-700 hover:border-blue-400 shadow-sm";
                       }

                       return (
                         <button key={assign.id} disabled={assign.is_locked} onClick={() => handleOpen(assign)} className={btnClass}>
                             <span className="truncate flex items-center">
                                {isDone ? <Check className="w-3 h-3 mr-1.5" /> : null}
                                {isHW ? 'HW' : 'EX'}
                             </span>
                             {!assign.is_locked && !isDone && <Play className="w-3 h-3 opacity-50" />}
                             {isDone && isHW && <span className="ml-1 text-[10px] bg-white px-1.5 rounded border shadow-sm">{assign.user_score}%</span>}
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
};