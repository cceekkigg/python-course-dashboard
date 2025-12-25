import React, { useState, useEffect } from 'react';
import { User, StudentRecord, DashboardViewType, Announcement } from '../types';
import { LogOut, BookOpen, Award, TrendingUp, Code, Home, Calendar, Shield, Settings, X, Lock, CheckCircle } from 'lucide-react';
import { INITIAL_ANNOUNCEMENTS } from '../data/mockData';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../data/supabaseClient'; // Import Supabase

// Import Sub-Panels
import { HomePanel } from './panels/HomePanel';
import { MaterialsPanel } from './panels/MaterialsPanel';
import { PracticePanel } from './panels/PracticePanel';
import { AssignmentsPanel } from './panels/AssignmentsPanel';
import { AdminPanel } from './panels/AdminPanel';

interface DashboardViewProps {
  user: User;
  onLogout: () => void;
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
  onUpdateUser?: (user: User) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onLogout,
  students,
  onUpdateStudents,
  onUpdateUser
}) => {
  const [currentView, setCurrentView] = useState<DashboardViewType>(DashboardViewType.HOME);

  // Announcements State (Initialize empty, fetch from DB)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // FETCH: Load Announcements from Supabase
  useEffect(() => {
    const fetchAnnouncements = async () => {
      // Fetch all announcements ordered by date
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setAnnouncements(data as Announcement[]);
      } else {
        // Fallback if DB is empty or fails
        setAnnouncements(INITIAL_ANNOUNCEMENTS);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleAddAnnouncement = (ann: Announcement) => {
    setAnnouncements([ann, ...announcements]);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const handleAssignmentComplete = (assignmentId: string, score: number) => {
    if (user.role !== 'student' || !onUpdateUser) return;

    const currentUser = user as StudentRecord;
    const updatedUser = {
      ...currentUser,
      assignmentScores: {
        ...currentUser.assignmentScores,
        [assignmentId]: score
      }
    };

    onUpdateUser(updatedUser);
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword || !onUpdateUser) return;

      const updatedUser = { ...user, password: newPassword };
      onUpdateUser(updatedUser);
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setTimeout(() => {
          setIsSettingsOpen(false);
          setPasswordSuccess('');
      }, 1500);
  };

  // Nav Items Configuration
  const navItems = [
    { id: DashboardViewType.HOME, label: 'My Dashboard', icon: Home },
    { id: DashboardViewType.MATERIALS, label: 'Course Material', icon: BookOpen },
    { id: DashboardViewType.PRACTICE, label: 'Practice Arena', icon: Code },
  ];

  if (user.role !== 'guest') {
    navItems.push({ id: DashboardViewType.ASSIGNMENTS, label: 'Exercise & HW', icon: Calendar });
  }

  if (user.role === 'admin') {
    navItems.push({ id: DashboardViewType.ADMIN, label: 'Admin Tools', icon: Shield });
  }

  const renderContent = () => {
    switch (currentView) {
      case DashboardViewType.HOME:
        // Filter: Home panel only shows ACTIVE announcements
        const activeAnnouncements = announcements.filter(a => a.is_active !== false);
        return <HomePanel user={user as StudentRecord} announcements={activeAnnouncements} />;
      case DashboardViewType.MATERIALS:
        return <MaterialsPanel />;
      case DashboardViewType.PRACTICE:
        return <PracticePanel />;
      case DashboardViewType.ASSIGNMENTS:
        return user.role !== 'guest' ? (
             <AssignmentsPanel user={user as StudentRecord} onComplete={handleAssignmentComplete} />
        ) : <div>Access Denied</div>;
      case DashboardViewType.ADMIN:
        return user.role === 'admin' ? (
          <AdminPanel
             announcements={announcements} // Admin sees ALL (including drafts)
             onAddAnnouncement={handleAddAnnouncement}
             onDeleteAnnouncement={handleDeleteAnnouncement}
             students={students}
             onUpdateStudents={onUpdateStudents}
          />
        ) : <div>Access Denied</div>;
      default:
        return <div>Not Implemented</div>;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row font-sans">

      {/* Sidebar Navigation */}
      <aside className="w-full bg-slate-900 text-white lg:h-screen lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:overflow-y-auto z-10 flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2 font-bold text-xl tracking-wider">
             <Code className="text-yellow-400" />
             <span>PY<span className="text-yellow-400">STARTER</span></span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = currentView === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => setCurrentView(item.id)}
                 className={`w-full group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                   ${isActive
                     ? 'bg-blue-600 text-white shadow-md'
                     : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                   }`}
               >
                 <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                 {item.label}
               </button>
             );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
           <div className="rounded-xl bg-slate-800 p-3">
              <div className="flex items-center space-x-3 mb-3 relative">
                 <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full border border-slate-600" />
                 <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white flex items-center gap-2">
                        {user.name}
                        {user.role === 'guest' && (
                            <span className="text-[10px] bg-yellow-500 text-slate-900 px-1.5 py-0.5 rounded font-bold">DEMO</span>
                        )}
                    </p>
                    <p className="truncate text-xs text-slate-400 capitalize">{user.role}</p>
                 </div>

                 {user.role !== 'guest' ? (
                     <button onClick={() => setIsSettingsOpen(true)} className="absolute right-0 top-0 p-1 text-slate-400 hover:text-white">
                        <Settings className="w-4 h-4" />
                     </button>
                 ) : (
                     <div className="absolute right-0 top-0 p-1 text-slate-600 cursor-not-allowed" title="Settings disabled in Demo Mode">
                        <Lock className="w-3 h-3" />
                     </div>
                 )}
              </div>
              <button 
                onClick={onLogout}
                className="flex w-full items-center justify-center rounded-lg border border-slate-600 bg-transparent px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <LogOut className="mr-2 h-3 w-3" />
                Sign Out
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
           {renderContent()}
        </div>
      </main>

      {/* Profile/Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Account Settings</h3>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <Input 
                            label="New Password"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            icon={<Lock className="h-5 w-5" />}
                        />
                        {passwordSuccess && (
                            <div className="text-green-600 text-sm flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2" /> {passwordSuccess}
                            </div>
                        )}
                        <Button type="submit" fullWidth disabled={!newPassword}>Update Password</Button>
                    </form>
                </div>
             </div>
          </div>
      )}

    </div>
  );
};

export default DashboardView;