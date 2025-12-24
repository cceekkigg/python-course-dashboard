import React, { useState } from 'react';
import { User, AppView, StudentRecord } from './types';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import { MOCK_STUDENTS } from './data/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  
  // Lifted State: Manage students here so Admin updates persist for Login logic
  const [students, setStudents] = useState<StudentRecord[]>(MOCK_STUDENTS);

  const handleLogin = (loggedInUser: User) => {
    // If the user is a student, ensure we grab the latest version from the students array
    if (loggedInUser.role === 'student') {
       const freshUser = students.find(s => s.id === loggedInUser.id) || loggedInUser;
       setUser(freshUser);
    } else {
       setUser(loggedInUser);
    }
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(AppView.LOGIN);
  };

  // Handler to update the current user state specifically
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    // Also sync back to students array if it's a student
    if (updatedUser.role === 'student') {
      setStudents(prev => prev.map(s => s.id === updatedUser.id ? (updatedUser as StudentRecord) : s));
    }
  };

  return (
    <div className="min-h-screen w-full">
      {currentView === AppView.LOGIN ? (
        <LoginView onLogin={handleLogin} students={students} />
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