import React, { useState, useEffect } from 'react';
import { StudentRecord, Announcement, AccessLog, CourseWeek, AssignmentContent } from '../../types';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { supabase } from '../../data/supabaseClient';
import { Search, Edit2, Users, Bell, Activity, Globe, X, RefreshCw, Upload, AlertTriangle, BookOpen, Lock, Unlock } from 'lucide-react';

interface AdminPanelProps {
  announcements: Announcement[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
}

type AdminTab = 'users' | 'announcements' | 'scores' | 'visitors' | 'materials' | 'assignments';

export const AdminPanel: React.FC<AdminPanelProps> = ({ students, onUpdateStudents, announcements, onAddAnnouncement, onDeleteAnnouncement }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [dbAnnouncements, setDbAnnouncements] = useState<Announcement[]>([]);

  // User Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

  // Announcement State
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');

  // Material Upload State
  const [uploading, setUploading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Weeks & Assignments State
  const [adminWeeks, setAdminWeeks] = useState<CourseWeek[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<AssignmentContent[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // --- FETCHERS ---
  const fetchLogs = async () => {
    const { data } = await supabase.from('access_logs').select('*').order('login_time', { ascending: false }).limit(50);
    if (data) setLogs(data as AccessLog[]);
  };

  const fetchWeeks = async () => {
      const { data, error } = await supabase.from('weeks').select('*, days(*)').order('week_number', { ascending: true });
      if (data) {
          const sorted = data.map((w: any) => ({
              ...w,
              days: w.days.sort((a: any, b: any) => a.day_index - b.day_index)
          }));
          setAdminWeeks(sorted);
          if (sorted.length > 0 && sorted[0].days.length > 0) {
              setSelectedDay(sorted[0].days[0].id);
          }
      }
  };

  const fetchAssignments = async () => {
    setAssignmentLoading(true);
    const { data } = await supabase.from('content_assignments').select('*').order('day_index', { ascending: true });
    if (data) setAdminAssignments(data as AssignmentContent[]);
    setAssignmentLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'visitors') fetchLogs();
    if (activeTab === 'materials') fetchWeeks();
    if (activeTab === 'assignments') fetchAssignments();
    setDbAnnouncements(announcements);
  }, [activeTab, announcements]);

  // --- HANDLERS ---
  const handleEditClick = (student: StudentRecord) => { setEditingStudent({ ...student }); setIsModalOpen(true); };

  const handleModalSave = async () => {
    if (!editingStudent) return;
    const updatedList = students.map(s => s.id === editingStudent.id ? editingStudent : s);
    onUpdateStudents(updatedList);
    const { error } = await supabase.from('users').update({
        name: editingStudent.name, email: editingStudent.email, role: editingStudent.role, password: editingStudent.password, profession: editingStudent.profession, notes: editingStudent.notes
    }).eq('id', editingStudent.id);
    if (error) alert("Error updating database: " + error.message);
    else { setIsModalOpen(false); setEditingStudent(null); }
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from('announcements').insert({ title: newAnnTitle, message: newAnnMsg, is_active: true, date: new Date().toISOString() }).select().single();
    if (data) { onAddAnnouncement(data as Announcement); setNewAnnTitle(''); setNewAnnMsg(''); }
  };

  const toggleAnnouncement = async (id: string, currentState: boolean) => {
    await supabase.from('announcements').update({ is_active: !currentState }).eq('id', id);
    setDbAnnouncements(dbAnnouncements.map(a => a.id === id ? { ...a, is_active: !currentState } : a));
  };

  const handleScoreUpdate = async (studentId: string, field: string, value: string) => {
     const student = students.find(s => s.id === studentId);
     if (!student) return;
     const numValue = parseInt(value) || 0;
     const updatedStudent = { ...student };
     let dbUpdate = {};
     if (field === 'attendance') { updatedStudent.attendance = numValue; dbUpdate = { attendance: numValue }; }
     else { const newScores = { ...student.assignmentScores, [field]: numValue }; updatedStudent.assignmentScores = newScores; dbUpdate = { assignmentScores: newScores }; }
     onUpdateStudents(students.map(s => s.id === studentId ? updatedStudent : s));
     await supabase.from('users').update(dbUpdate).eq('id', studentId);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedDay) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('course-materials').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(fileName);

      const weekId = adminWeeks.find(w => w.days.some(d => d.id === selectedDay))?.id;

      const { error: dbError } = await supabase.from('materials').insert({
        title: file.name, type: fileExt === 'csv' ? 'csv' : 'pdf', url: publicUrl, week_id: weekId, day_id: selectedDay
      });
      if (dbError) throw dbError;
      alert("✅ File uploaded successfully!"); setFile(null);
    } catch (error: any) { console.error(error); alert("Error uploading: " + error.message); }
    finally { setUploading(false); }
  };

  const toggleAssignmentLock = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setAdminAssignments(prev => prev.map(a => a.id === id ? { ...a, is_locked: !currentStatus } : a));

    // DB Update
    const { error } = await supabase
        .from('content_assignments')
        .update({ is_locked: !currentStatus })
        .eq('id', id);

    if (error) {
        alert("Failed to update lock: " + error.message);
        fetchAssignments(); // Revert on error
    }
  };

  const filteredUsers = students.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const homeworkIds = Array.from({length: 10}, (_, i) => `hw-${i+1}`);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
        {activeTab === 'users' && (
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="pl-9 pr-4 py-2 w-64" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        )}
      </header>
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
            { id: 'users', icon: Users, label: 'User Management' },
            { id: 'scores', icon: Activity, label: 'Status & Scores' },
            { id: 'assignments', icon: BookOpen, label: 'Content' },
            { id: 'materials', icon: Upload, label: 'Materials' },
            { id: 'announcements', icon: Bell, label: 'Announcements' },
            { id: 'visitors', icon: Globe, label: 'Visitor Logs' }
        ]
        .map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
            </button>
        ))}
      </div>

      {/* 1. USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left font-bold text-slate-500">User</th><th className="px-6 py-3 text-left font-bold text-slate-500">Role</th><th className="px-6 py-3 text-left font-bold text-slate-500">Email</th><th className="px-6 py-3 text-right font-bold text-slate-500">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                            <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                            <td className="px-6 py-4 text-slate-500">{user.email}</td>
                            <td className="px-6 py-4 text-right"><Button size="sm" variant="outline" onClick={() => handleEditClick(user)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* 2. STATUS & SCORES TAB */}
      {activeTab === 'scores' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 shadow-sm">Student</th>
                        <th className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50 border-x border-blue-100">Attd (15)</th>
                        {homeworkIds.map((id, i) => (<th key={id} className="px-2 py-3 text-center font-bold text-slate-500 min-w-[60px]">HW {i+1}</th>))}
                        <th className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredUsers.filter(u => u.role === 'student').map(student => {
                        const attendanceCount = student.attendance || 0;
                        const hwSum = homeworkIds.reduce((sum, id) => sum + (student.assignmentScores?.[id] || 0), 0);
                        return (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">{student.name}</td>
                                <td className="px-2 py-3 text-center bg-blue-50/30">
                                    <input type="number" max="15" min="0" className="w-10 text-center border rounded border-blue-200 text-blue-800 font-bold focus:outline-none focus:border-blue-500" value={attendanceCount} onChange={(e) => handleScoreUpdate(student.id, 'attendance', e.target.value)} />
                                </td>
                                {homeworkIds.map(hwId => (
                                    <td key={hwId} className="px-2 py-3 text-center border-r border-slate-100">
                                        <input type="number" className="w-10 text-center border border-slate-200 rounded text-slate-600 focus:outline-none focus:border-blue-500" value={student.assignmentScores?.[hwId] || 0} onChange={(e) => handleScoreUpdate(student.id, hwId, e.target.value)} />
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-center font-black text-slate-900 bg-slate-50 border-l border-slate-200">{hwSum}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}

      {/* 3. ASSIGNMENTS CONTENT TAB */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Course Content Control</h3>
                <Button size="sm" variant="outline" onClick={fetchAssignments}><RefreshCw className="w-3 h-3 mr-2"/> Refresh</Button>
             </div>
             {assignmentLoading ? (
                 <div className="p-8 text-center text-slate-400">Loading assignments...</div>
             ) : (
                 <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left font-bold text-slate-500">Day</th>
                            <th className="px-6 py-3 text-left font-bold text-slate-500">Type</th>
                            <th className="px-6 py-3 text-left font-bold text-slate-500">Title</th>
                            <th className="px-6 py-3 text-left font-bold text-slate-500">Status</th>
                            <th className="px-6 py-3 text-right font-bold text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {adminAssignments.map(assign => (
                            <tr key={assign.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-mono text-slate-500">Day {assign.day_index + 1}</td>
                                <td className="px-6 py-3 capitalize">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${assign.type === 'homework' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {assign.type}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-900">{assign.title}</td>
                                <td className="px-6 py-3">
                                    {assign.is_locked ? (
                                        <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded w-fit text-xs font-bold"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                                    ) : (
                                        <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded w-fit text-xs font-bold"><Unlock className="w-3 h-3 mr-1"/> Visible</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => toggleAssignmentLock(assign.id, !!assign.is_locked)}
                                        className={assign.is_locked ? "text-green-700 hover:bg-green-50 border-green-200" : "text-red-700 hover:bg-red-50 border-red-200"}
                                    >
                                        {assign.is_locked ? 'Unlock' : 'Lock'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
        </div>
      )}

      {/* 4. MATERIALS UPLOAD TAB */}
      {activeTab === 'materials' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-lg">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Upload Course Material</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Select Day</label>
              <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                {adminWeeks.map(week => (
                  <optgroup key={week.id} label={`Week ${week.week_number}: ${week.title}`}>
                    {week.days.map(day => <option key={day.id} value={day.id}>{day.title}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">File</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                 <input type="file" id="file-upload" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                 <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? <div className="text-blue-600 font-medium break-all">{file.name}</div> : <div className="text-slate-500 text-sm">Click to select a file <br/> <span className="text-xs text-slate-400">(PDF, CSV, Slides)</span></div>}
                 </label>
              </div>
            </div>
            <Button type="submit" fullWidth disabled={uploading || !file}>{uploading ? 'Uploading...' : 'Upload & Save'}</Button>
          </form>
        </div>
      )}

      {/* 5. ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="font-bold mb-4">Create New</h3>
                <form onSubmit={createAnnouncement} className="space-y-4">
                    <Input label="Title" value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} required />
                    <textarea className="w-full border rounded-lg p-2 text-sm" rows={4} placeholder="Message..." value={newAnnMsg} onChange={e => setNewAnnMsg(e.target.value)} required />
                    <Button type="submit" fullWidth>Post</Button>
                </form>
            </div>
            <div className="md:col-span-2 space-y-3 max-h-[500px] overflow-y-auto">
                {dbAnnouncements.map(ann => (
                    <div key={ann.id} className={`p-4 rounded-lg border flex justify-between items-start ${ann.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-75'}`}>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900">{ann.title}</h4>
                                {ann.is_active ? <span className="text-xs bg-green-100 text-green-700 px-2 rounded">Active</span> : <span className="text-xs bg-slate-200 text-slate-600 px-2 rounded">Draft</span>}
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{ann.message}</p>
                            <div className="text-xs text-slate-400 mt-2">{new Date(ann.date || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => toggleAnnouncement(ann.id, !!ann.is_active)} className={`text-xs px-3 py-1 rounded border ${ann.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {ann.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 6. VISITORS TAB */}
      {activeTab === 'visitors' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-700">Recent Login Activity</h3><Button size="sm" variant="outline" onClick={fetchLogs}><RefreshCw className="w-3 h-3 mr-2"/> Refresh</Button></div>
             <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white"><tr><th className="px-6 py-3 text-left font-bold text-slate-500">Time</th><th className="px-6 py-3 text-left font-bold text-slate-500">User</th><th className="px-6 py-3 text-left font-bold text-slate-500">Role</th><th className="px-6 py-3 text-left font-bold text-slate-500">IP Address</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                    {logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-500">{new Date(log.login_time).toLocaleString()}</td>
                            <td className="px-6 py-3 font-medium text-slate-900">{log.user_name}</td>
                            <td className="px-6 py-3"><span className={`text-xs px-2 py-1 rounded capitalize ${log.role === 'admin' ? 'bg-purple-100 text-purple-700' : log.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{log.role}</span></td>
                            <td className="px-6 py-3 font-mono text-xs text-slate-600">{log.ip_address}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {/* EDIT MODAL */}
      {isModalOpen && editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <Input label="Full Name" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                    <Input label="Email" value={editingStudent.email} onChange={e => setEditingStudent({...editingStudent, email: e.target.value})} />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editingStudent.role} onChange={e => setEditingStudent({...editingStudent, role: e.target.value as any})}>
                            <option value="student">Student</option>
                            <option value="guest">Guest</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <Input label="Password" value={editingStudent.password || ''} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} />
                        <div className="mt-2 flex items-start gap-2 p-2 bg-orange-50 border border-orange-100 rounded text-xs text-orange-700">
                             <AlertTriangle className="w-4 h-4 shrink-0" />
                            <p><strong>Important:</strong> Changing the password here only updates the database record. To allow the student to log in with this new password, you must <strong>Delete</strong> their account from the Supabase Auth Dashboard to trigger a re-registration.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Profession / Bio</label>
                        <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editingStudent.profession || ''} onChange={e => setEditingStudent({...editingStudent, profession: e.target.value})} />
                    </div>
                    <div className="pt-2 flex justify-end gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleModalSave}>Save Changes</Button></div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};