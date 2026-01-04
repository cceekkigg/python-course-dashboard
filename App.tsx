// ==============================================================================
// FILE PATH: App.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from './data/supabaseClient';
import { User, AppView, StudentRecord } from './types';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(true); // [NEW] Loading state

  /**
   * Fetches full class list. Only accessible by Admins.
   */
  const loadClassData = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      if (data) setStudents(data as StudentRecord[]);
    } catch (err) {
      console.error("Failed to load class data:", err);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(AppView.DASHBOARD);
    if (loggedInUser.role === 'admin') {
      loadClassData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut(); // [NEW] Ensure real sign out
    setUser(null);
    setStudents([]);
    setCurrentView(AppView.LOGIN);
  };

  // [NEW] ------------------------------------------------------------------
  // SESSION LISTENER: Handles Magic Links & Page Reloads
  // ------------------------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      // 1. Check if Supabase has an active session (from Link or Storage)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        console.log("⚡ Session found. Restoring user profile...");
        try {
            // 2. Fetch the user's role and details from your public table
            const { data: rosterUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (rosterUser) {
                // 3. Link Auth ID if missing (Fixes 'Zombie' accounts)
                if (!rosterUser.auth_id) {
                    await supabase.from('users').update({ auth_id: session.user.id }).eq('id', rosterUser.id);
                }
                // 4. Auto-Login
                handleLogin(rosterUser as User);
            }
        } catch (err) {
            console.error("Error restoring session:", err);
        }
      }
      setLoadingSession(false);
    };

    restoreSession();

    // Listen for the "Magic Link" event specifically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_IN' && session) {
            restoreSession();
        }
    });

    return () => subscription.unsubscribe();
  }, []);
  // ------------------------------------------------------------------------


  const handleUpdateUser = async (updatedUser: User) => {
    // 1. Guest Guard
    if (updatedUser.role === 'guest') {
      alert("🔒 Demo Mode: Changes are not saved.");
      setUser(updatedUser);
      return;
    }

    // 2. Optimistic Update
    setUser(updatedUser);

    // 3. Database Update
    if (updatedUser.role === 'student') {
      const studentData = updatedUser as StudentRecord;
      const { error } = await supabase
        .from('users')
        .update({
          password: updatedUser.password, // Keeps legacy password field synced
          assignmentScores: studentData.assignmentScores,
          attendance: studentData.attendance,
          notes: studentData.notes,
          profession: studentData.profession,
          avatarUrl: updatedUser.avatarUrl
        })
        .eq('id', updatedUser.id);

      if (error) {
        console.error("Save failed:", error);
        alert("Error saving data to database.");
      } else {
        console.log("✅ Data saved to Supabase");
      }
    }
  };

  if (loadingSession) {
      return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading PyPathway...</div>;
  }

  return (
    <div className="min-h-screen w-full">
      {currentView === AppView.LOGIN ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <DashboardView
          user={user!}
          onLogout={handleLogout}
          students={students}
          onUpdateStudents={setStudents}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </div>
  );
};

export default App;