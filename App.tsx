import React, { useState } from 'react';
import { User, AppView, StudentRecord } from './types';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import { supabase } from './data/supabaseClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);

  // 1. CLEANUP: We no longer store the huge "students" list in App state
  const [students, setStudents] = useState<StudentRecord[]>([]);

  // 2. NEW LOGIC: Only fetch class list IF the logged-in user is an Admin
  const loadClassData = async () => {
      const { data } = await supabase.from('users').select('*');
      if (data) setStudents(data as StudentRecord[]);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(AppView.DASHBOARD);

    // Only load the full class list if we are an Admin
    if (loggedInUser.role === 'admin') {
        loadClassData();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStudents([]); // Clear data on logout
    setCurrentView(AppView.LOGIN);
  };

  // 3. PERSISTENCE FIX: This function now saves to Supabase
  const handleUpdateUser = async (updatedUser: User) => {
    // A. Guest Check
    if (updatedUser.role === 'guest') {
        alert("🔒 Demo Mode: Changes are not saved.");
        setUser(updatedUser);
        return;
    }

    // B. Optimistic Update (Screen updates instantly)
    setUser(updatedUser);

    // C. Database Update (The missing piece!)
    if (updatedUser.role === 'student') {
        const { error } = await supabase
            .from('users')
            .update({
                password: updatedUser.password,
                assignmentScores: (updatedUser as StudentRecord).assignmentScores,
                attendance: (updatedUser as StudentRecord).attendance,
                notes: (updatedUser as StudentRecord).notes,
                profession: (updatedUser as StudentRecord).profession,
                avatarUrl: updatedUser.avatarUrl
            })
            .eq('id', updatedUser.id); // IMPORTANT: Update specific row ID

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