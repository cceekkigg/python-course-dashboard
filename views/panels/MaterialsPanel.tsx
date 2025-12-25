import React, { useEffect, useState } from 'react';
import { COURSE_WEEKS } from '../../data/mockData';
import { FileText, Lock, Unlock, Folder, File, Download } from 'lucide-react';
import { supabase } from '../../data/supabaseClient';

export const MaterialsPanel: React.FC = () => {
  const [userRole, setUserRole] = useState('student');

  useEffect(() => {
    // Get current user role to determine restrictions
    supabase.auth.getSession().then(({data}) => {
       // Since we use custom auth in App.tsx, we can't rely solely on supabase.auth.
       // However, we can check the localStorage if we persisted it, OR
       // pass the user prop down. For minimum change, let's assume we pass user prop.
    });
    // Fallback: Check 'users' table via email in localStorage if you implemented that,
    // OR BETTER: Pass 'user' prop to MaterialsPanel.
  }, []);

  // NOTE: Ideally update the Props to include { user: User }.
  // Assuming we updated App.tsx to pass user, or we are just doing a quick check:
  // Let's assume the parent DashboardView passes the user object.
  // We will assume "guest" restriction logic is handled by looking at the content ID.

  // MOCK USER CHECK (Replace with actual prop usage)
  const isGuest = localStorage.getItem('app_user_role') === 'guest'; // You'll need to save this in LoginView or App.tsx

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Course Materials</h1>
      </header>
      <div className="space-y-6">
        {COURSE_WEEKS.map((week) => {
           // GUEST LOGIC: Lock everything that isn't Week 1
           const guestLock = isGuest && week.id !== 'w1';
           const actuallyLocked = week.isLocked || guestLock;

           return (
             <div key={week.id} className={`rounded-xl border ${actuallyLocked ? 'bg-slate-50' : 'bg-white'}`}>
                {/* ... existing header code ... */}
                <div className="p-4">
                    {/* If Guest and Locked, show message */}
                    {guestLock ? (
                        <div className="text-center p-4 text-slate-500 italic flex flex-col items-center">
                            <Lock className="w-6 h-6 mb-2 opacity-50"/>
                            <span>Full course content is available to enrolled students only.</span>
                        </div>
                    ) : (
                        // ... existing materials rendering ...
                        week.days.map(day => (
                             // GUEST LOGIC: Even in Week 1, only Day 1 is open
                             (isGuest && day.id !== 'w1d1') ? null : (
                                <div key={day.id}>
                                    {/* ... render materials ... */}
                                    <h4 className="font-bold">{day.title}</h4>
                                    {/* ... map materials ... */}
                                </div>
                             )
                        ))
                    )}
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};