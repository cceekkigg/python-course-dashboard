// ==============================================================================
// FILE PATH: App.tsx
// ==============================================================================

import React, { useState } from 'react';
import { supabase } from './data/supabaseClient';
import { User, AppView, StudentRecord } from './types';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);

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

  const handleLogout = () => {
    setUser(null);
    setStudents([]);
    setCurrentView(AppView.LOGIN);
  };

  /**
   * Handles user updates (Optimistic UI + Supabase Persistence)
   */
  const handleUpdateUser = async (updatedUser: User) => {
    // 1. Guest Guard
    if (updatedUser.role === 'guest') {
      alert("🔒 Demo Mode: Changes are not saved.");
      setUser(updatedUser); // Update local state only for demo feel
      return;
    }

    // 2. Optimistic Update
    setUser(updatedUser);

    // 3. Database Update (Persist Student Data)
    if (updatedUser.role === 'student') {
      const studentData = updatedUser as StudentRecord;

      const { error } = await supabase
        .from('users')
        .update({
          password: updatedUser.password,
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