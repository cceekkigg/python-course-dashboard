import React, { useState, useEffect } from 'react';
import { StudentRecord, Announcement, AccessLog, CourseWeek, AssignmentContent, DeadlineItem, Material } from '../../types';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { supabase } from '../../data/supabaseClient';
import { Search, Edit2, Users, Bell, Activity, Globe, X, RefreshCw, Upload, AlertTriangle, BookOpen,
    Lock, Unlock, Trash2, Calendar, Save, Link as LinkIcon } from 'lucide-react';

interface AdminPanelProps {
  announcements: Announcement[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onUpdateAnnouncement: (ann: Announcement) => void;
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
}

type AdminTab = 'users' | 'announcements' | 'scores' | 'visitors' | 'materials' | 'assignments';

export const AdminPanel: React.FC<AdminPanelProps> = ({ students, onUpdateStudents, announcements, onAddAnnouncement, onDeleteAnnouncement, onUpdateAnnouncement }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [dbAnnouncements, setDbAnnouncements] = useState<Announcement[]>([]);

  // User Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);

  // Announcement State
  const [editAnnId, setEditAnnId] = useState<string | null>(null);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');

  // Deadlines State
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [newDlDate, setNewDlDate] = useState('');
  const [newDlTask, setNewDlTask] = useState('');
  const [newDlSub, setNewDlSub] = useState('');

  // Material Upload State
  const [uploading, setUploading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [materialMode, setMaterialMode] = useState<'file' | 'link'>('file');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Weeks & Assignments State
  const [adminWeeks, setAdminWeeks] = useState<CourseWeek[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<AssignmentContent[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Scores State
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [isSavingScores, setIsSavingScores] = useState(false);

  // --- FETCHERS ---
  const fetchLogs = async () => {
    const { data } = await supabase.from('access_logs').select('*').order('login_time', { ascending: false }).limit(50);
    if (data) setLogs(data as AccessLog[]);
  };

  const fetchWeeks = async () => {
      const { data } = await supabase.from('weeks').select('*, days(*)').order('week_number', { ascending: true });
      if (data) {
          const sorted = data.map((w: any) => ({
              ...w,
              days: w.days.sort((a: any, b: any) => a.day_index - b.day_index)
          }));
          setAdminWeeks(sorted);
          if (sorted.length > 0 && sorted[0].days.length > 0) setSelectedDay(sorted[0].days[0].id);
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

    if (activeTab === 'announcements') {
        const loadDeadlines = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'next_deadlines').maybeSingle();
            if (data?.value) {
                try { setDeadlines(JSON.parse(data.value));
                } catch(e) {}
            }
        };
        loadDeadlines();
    }
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

  const handleDeleteUser = async (studentId: string) => {
    if (!confirm("Are you sure? This removes the user from the roster, preventing login.")) return;
    const updatedList = students.filter(s => s.id !== studentId);
    onUpdateStudents(updatedList);
    const { error } = await supabase.from('users').delete().eq('id', studentId);
    if (error) {
        alert("Failed to delete user: " + error.message);
        onUpdateStudents(students);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editAnnId) {
        const { error } = await supabase.from('announcements')
            .update({ title: newAnnTitle, message: newAnnMsg })
            .eq('id', editAnnId);
        if (!error) {
            const updated = announcements.find(a => a.id === editAnnId);
            if (updated) onUpdateAnnouncement({ ...updated, title: newAnnTitle, message: newAnnMsg });
            cancelEditAnnouncement();
        }
    } else {
        const { data } = await supabase.from('announcements')
            .insert({ title: newAnnTitle, message: newAnnMsg, is_active: true, date: new Date().toISOString() })
            .select().single();
        if (data) { onAddAnnouncement(data as Announcement); setNewAnnTitle(''); setNewAnnMsg(''); }
    }
  };

  const startEditAnnouncement = (ann: Announcement) => { setEditAnnId(ann.id); setNewAnnTitle(ann.title); setNewAnnMsg(ann.message); };
  const cancelEditAnnouncement = () => { setEditAnnId(null); setNewAnnTitle(''); setNewAnnMsg(''); };

  const toggleAnnouncement = async (id: string, currentState: boolean) => {
    const newState = !currentState;
    setDbAnnouncements(dbAnnouncements.map(a => a.id === id ? { ...a, is_active: newState } : a));
    const ann = dbAnnouncements.find(a => a.id === id);
    if (ann) onUpdateAnnouncement({ ...ann, is_active: newState });
    await supabase.from('announcements').update({ is_active: newState }).eq('id', id);
  };

  const handleDeleteAnnouncementClick = async (id: string) => {
      if(!confirm("Delete this announcement?")) return;
      onDeleteAnnouncement(id);
      await supabase.from('announcements').delete().eq('id', id);
  };

  const addDeadline = async () => {
      if (!newDlDate || !newDlTask) return;
      const newItem = { date: newDlDate, task: newDlTask, subtext: newDlSub };
      const updated = [...deadlines, newItem];
      setDeadlines(updated);
      await saveDeadlinesToDB(updated);
      setNewDlDate('');
      setNewDlTask(''); setNewDlSub('');
  };

  const removeDeadline = async (index: number) => {
      const updated = deadlines.filter((_, i) => i !== index);
      setDeadlines(updated);
      await saveDeadlinesToDB(updated);
  };

  const saveDeadlinesToDB = async (items: DeadlineItem[]) => {
      await supabase.from('app_settings').upsert({ key: 'next_deadlines', value: JSON.stringify(items) });
  };

  // --- ATTENDANCE & SCORES HANDLERS (UPDATED) ---
  const handleScoreChange = (studentId: string, type: 'attendance' | 'hw', value: string, key?: string) => {
      const numValue = parseInt(value) || 0;

      const updatedList = students.map(s => {
          if (s.id !== studentId) return s;
          if (type === 'attendance') {
              return { ...s, attendance: numValue };
          }
          if (type === 'hw' && key) {
              const currentScores = s.assignmentScores || {};
              return {
                  ...s,
                  assignmentScores: {
                      ...currentScores,
                      [key]: numValue
                  }
              };
          }
          return s;
      });

      onUpdateStudents(updatedList);
      setPendingSaves(prev => new Set(prev).add(studentId));
  };

  const saveChanges = async () => {
      if (pendingSaves.size === 0) return;
      setIsSavingScores(true);
      try {
          const updates = Array.from(pendingSaves).map(async (id) => {
              const s = students.find(u => u.id === id);
              if (!s) return;

              // Upsert both attendance and the full jsonb assignmentScores
              const { data, error } = await supabase
                  .from('users')
                  .update({
                      attendance: s.attendance,
                      assignmentScores: s.assignmentScores
                  })
                  .eq('id', id)
                  .select();

              if (error) throw error;
              if (!data || data.length === 0) throw new Error(`Permission denied for user ${s.name} (RLS Blocked)`);
          });
          await Promise.all(updates);
          setPendingSaves(new Set());
          alert("✅ Records updated successfully!");

      } catch (e: any) {
          console.error("Save failed:", e);
          alert(`Error saving: ${e.message}`);
      } finally {
          setIsSavingScores(false);
      }
  };

  // --- MATERIAL & CONTENT HANDLERS ---
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

      const week = adminWeeks.find(w => w.days.some(d => d.id === selectedDay));
      const dayObj = week?.days.find(d => d.id === selectedDay);
      const dayIndex = dayObj ? dayObj.day_index : -99;
      let type: Material['type'] = 'link';
      if (fileExt === 'pdf') type = 'pdf';
      else if (['csv', 'xlsx'].includes(fileExt || '')) type = 'csv';
      else if (['ppt', 'pptx'].includes(fileExt || '')) type = 'slides';
      const { error: dbError } = await supabase.from('materials').insert({
        title: file.name, type: type, url: publicUrl, week_id: week?.id, day_id: selectedDay, day_index: dayIndex
      });
      if (dbError) throw dbError;
      alert("✅ File uploaded successfully!");
      setFile(null);
    } catch (error: any) {
      alert("Error uploading: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle || !linkUrl || !selectedDay) return;
    const week = adminWeeks.find(w => w.days.some(d => d.id === selectedDay));
    const dayObj = week?.days.find(d => d.id === selectedDay);
    const dayIndex = dayObj ? dayObj.day_index : 0;
    try {
        setUploading(true);
        const { error } = await supabase.from('materials').insert({
            title: linkTitle, type: 'link', url: linkUrl, week_id: week?.id, day_id: selectedDay, day_index: dayIndex
        });
        if (error) throw error;
        alert("✅ Link added successfully!");
        setLinkTitle(''); setLinkUrl('');
    } catch (error: any) {
        alert("Error adding link: " + error.message);
    } finally {
        setUploading(false);
    }
  };

  const toggleAssignmentLock = async (id: string, currentStatus: boolean) => {
    setAdminAssignments(prev => prev.map(a => a.id === id ? { ...a, is_locked: !currentStatus } : a));
    const { error } = await supabase.from('content_assignments').update({ is_locked: !currentStatus }).eq('id', id);
    if (error) { alert("Failed to update lock: " + error.message); fetchAssignments(); }
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

        {/* TAB NAVIGATION */}
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
              <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)} className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ?
                'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
              </button>
          ))}
        </div>

        {/* 1. USERS TAB */}
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
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEditClick(user)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(user.id)}><Trash2 className="w-3 h-3" /></Button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        )}

        {/* 2. SCORES TAB (Updated for Attendance + Final Project Editing) */}
        {activeTab === 'scores' && (
          <div className="space-y-4">
               <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <div className="text-sm text-slate-600 flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4 text-slate-400" />
                     <span><strong>Note:</strong> Attendance and Final Project (FP) scores are editable.</span>
                 </div>
                 {pendingSaves.size > 0 && (
                     <Button size="sm" onClick={saveChanges} disabled={isSavingScores} className="bg-blue-600 hover:bg-blue-700 text-white">
                         <Save className="w-4 h-4 mr-2" />
                         {isSavingScores ? 'Saving...' : `Save ${pendingSaves.size} Changes`}
                     </Button>
                 )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 shadow-sm">Student</th>
                              <th className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50 border-x border-blue-100 w-24">Attd (15)</th>

                              {/* Read Only HW 1-10 Headers */}
                              {homeworkIds.map((id, i) => (
                                  <th key={id} className="px-2 py-3 text-center font-bold min-w-[50px] text-slate-500">
                                      HW {i+1}
                                  </th>
                              ))}

                              {/* [NEW] Final Project Header */}
                              <th className="px-2 py-3 text-center font-bold min-w-[80px] text-purple-700 bg-purple-50 border-x border-purple-100">
                                  FP (100)
                              </th>

                              <th className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {filteredUsers.filter(u => u.role === 'student').map(student => {
                              const attendanceCount = student.attendance || 0;

                              // Calculate total score: Sum(HW1-10) + FP
                              const hwSum = homeworkIds.reduce((sum, id) => sum + (student.assignmentScores?.[id] || 0), 0);
                              const fpScore = student.assignmentScores?.['hw-fp'] || 0;
                              const totalScore = hwSum + fpScore;

                              const isDirty = pendingSaves.has(student.id);
                              return (
                                  <tr key={student.id} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">{student.name}</td>

                                      {/* Attendance Input (Editable) */}
                                      <td className={`px-2 py-3 text-center bg-blue-50/30 ${isDirty ? 'bg-yellow-50' : ''}`}>
                                          <input
                                              type="number" max="15" min="0"
                                              className={`w-12 text-center border rounded font-bold focus:outline-none focus:border-blue-500 py-1 ${isDirty ? 'border-yellow-400 bg-yellow-50 text-yellow-900' : 'border-blue-200 text-blue-800'}`}
                                              value={attendanceCount}
                                              onChange={(e) => handleScoreChange(student.id, 'attendance', e.target.value)}
                                          />
                                      </td>

                                      {/* HW Columns (Read Only from DB) */}
                                      {homeworkIds.map(hwId => (
                                          <td key={hwId} className="px-2 py-3 text-center border-r border-slate-100 font-mono text-slate-400">
                                              {student.assignmentScores?.[hwId] || 0}
                                          </td>
                                      ))}

                                      {/* [NEW] Final Project Input (Editable) */}
                                      <td className={`px-2 py-3 text-center bg-purple-50/30 border-x border-purple-100 ${isDirty ? 'bg-yellow-50' : ''}`}>
                                          <input
                                              type="number" min="0" max="100"
                                              className={`w-14 text-center border rounded font-bold focus:outline-none focus:border-purple-500 py-1 text-xs ${isDirty ? 'border-yellow-400 bg-yellow-50' : 'border-purple-200 text-purple-800'}`}
                                              value={fpScore}
                                              onChange={(e) => handleScoreChange(student.id, 'hw', e.target.value, 'hw-fp')}
                                              placeholder="0"
                                          />
                                      </td>

                                      <td className="px-4 py-3 text-center font-black text-slate-900 bg-slate-50 border-l border-slate-200">{totalScore}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
        )}

        {/* 3. ASSIGNMENTS CONTENT TAB */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-700">Course Content Control</h3><Button size="sm" variant="outline" onClick={fetchAssignments}><RefreshCw className="w-3 h-3 mr-2"/> Refresh</Button></div>
               {assignmentLoading ? <div className="p-8 text-center text-slate-400">Loading assignments...</div> : <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-white"><tr><th className="px-6 py-3 text-left font-bold text-slate-500">Day</th><th className="px-6 py-3 text-left font-bold text-slate-500">Type</th><th className="px-6 py-3 text-left font-bold text-slate-500">Title</th><th className="px-6 py-3 text-left font-bold text-slate-500">Status</th><th className="px-6 py-3 text-right font-bold text-slate-500">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{adminAssignments.map(assign => (<tr key={assign.id} className="hover:bg-slate-50"><td className="px-6 py-3 font-mono text-slate-500">Day {assign.day_index + 1}</td><td className="px-6 py-3 capitalize"><span className={`px-2 py-1 rounded text-xs font-bold ${assign.type === 'homework' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{assign.type}</span></td><td className="px-6 py-3 font-medium text-slate-900">{assign.title}</td><td className="px-6 py-3">{assign.is_locked ? (<span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded w-fit text-xs font-bold"><Lock className="w-3 h-3 mr-1"/> Locked</span>) : (<span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded w-fit text-xs font-bold"><Unlock className="w-3 h-3 mr-1"/> Visible</span>)}</td><td className="px-6 py-3 text-right"><Button size="sm" variant="outline" onClick={() => toggleAssignmentLock(assign.id, !!assign.is_locked)} className={assign.is_locked ? "text-green-700 hover:bg-green-50 border-green-200" : "text-red-700 hover:bg-red-50 border-red-200"}>{assign.is_locked ? 'Unlock' : 'Lock'}</Button></td></tr>))}</tbody></table>}
          </div>
        )}

        {/* 4. MATERIALS UPLOAD TAB */}
        {activeTab === 'materials' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-lg">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Add Course Material</h3>
              {/* Mode Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                  <button onClick={() => setMaterialMode('file')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${materialMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>File Upload</button>
                  <button onClick={() => setMaterialMode('link')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${materialMode === 'link' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>External Link</button>
              </div>

              <form onSubmit={materialMode === 'file' ? handleFileUpload : handleLinkUpload} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700">Select Day</label>
                      <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                          {adminWeeks.map(week => (<optgroup key={week.id} label={`Week ${week.week_number}: ${week.title}`}>{week.days.map(day => <option key={day.id} value={day.id}>{day.title}</option>)}</optgroup>))}
                      </select>
                  </div>

                  {materialMode === 'file' ? (
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">File</label>
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                              <input type="file" id="file-upload" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                              <label htmlFor="file-upload" className="cursor-pointer">
                                  {file ? <div className="text-blue-600 font-medium break-all">{file.name}</div> : <div className="text-slate-500 text-sm">Click to select a file <br/> <span className="text-xs text-slate-400">(PDF, CSV, Slides)</span></div>}
                              </label>
                          </div>
                      </div>
                   ) : (
                      <>
                          <Input label="Link Title" placeholder="e.g. Weekly Survey" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} required />
                          <Input label="URL" placeholder="https://" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} icon={<LinkIcon className="w-4 h-4"/>} required />
                      </>
                  )}
                  <Button type="submit" fullWidth disabled={uploading || (materialMode === 'file' ? !file : !linkUrl)}>
                      {uploading ? 'Processing...' : (materialMode === 'file' ? 'Upload & Save' : 'Add Link')}
                  </Button>
              </form>
          </div>
        )}

        {/* 5. ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="grid md:grid-cols-3 gap-6"><div className="space-y-6"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold mb-4">{editAnnId ? 'Edit Announcement' : 'Create New'}</h3><form onSubmit={handleAnnouncementSubmit} className="space-y-4"><Input label="Title" value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} required /><textarea className="w-full border rounded-lg p-2 text-sm" rows={4} placeholder="Message..." value={newAnnMsg} onChange={e => setNewAnnMsg(e.target.value)} required /><div className="flex gap-2"><Button type="submit" fullWidth>{editAnnId ? 'Update' : 'Post'}</Button>{editAnnId && <Button type="button" variant="outline" onClick={cancelEditAnnouncement}><X className="w-4 h-4"/></Button>}</div></form></div><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-yellow-400"><h3 className="font-bold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/> Next Deadlines</h3><div className="space-y-2 mb-4">{deadlines.map((dl, idx) => (<div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border"><div><span className="font-bold text-yellow-700 bg-yellow-100 px-1 rounded mr-2">{dl.date}</span><span className="font-medium">{dl.task}</span></div><button onClick={() => removeDeadline(idx)} className="text-slate-400 hover:text-red-600"><X className="w-3 h-3"/></button></div>))}</div><div className="space-y-2 pt-2 border-t border-slate-100"><Input placeholder="Date (e.g. DEC 8)" value={newDlDate} onChange={e => setNewDlDate(e.target.value)} /><Input placeholder="Task Name" value={newDlTask} onChange={e => setNewDlTask(e.target.value)} /><Input placeholder="Subtext (e.g. Due 11pm)" value={newDlSub} onChange={e => setNewDlSub(e.target.value)} /><Button size="sm" variant="outline" fullWidth onClick={addDeadline} disabled={!newDlDate || !newDlTask}><Save className="w-3 h-3 mr-2"/> Add Deadline</Button></div></div></div><div className="md:col-span-2 space-y-3 max-h-[600px] overflow-y-auto">{dbAnnouncements.map(ann => (<div key={ann.id} className={`p-4 rounded-lg border flex justify-between items-start ${ann.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-75'}`}><div><div className="flex items-center gap-2"><h4 className="font-bold text-slate-900">{ann.title}</h4>{ann.is_active ? <span className="text-xs bg-green-100 text-green-700 px-2 rounded">Active</span> : <span className="text-xs bg-slate-200 text-slate-600 px-2 rounded">Draft</span>}</div><p className="text-sm text-slate-600 mt-1">{ann.message}</p><div className="text-xs text-slate-400 mt-2">{new Date(ann.date || Date.now()).toLocaleDateString()}</div></div><div className="flex gap-2"><button onClick={() => startEditAnnouncement(ann)} className="text-xs p-1 rounded border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button><button onClick={() => toggleAnnouncement(ann.id, !!ann.is_active)} className={`text-xs px-3 py-1 rounded border ${ann.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>{ann.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => handleDeleteAnnouncementClick(ann.id)} className="text-xs p-1 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div></div>))}</div></div>
        )}

        {/* 6. VISITORS TAB */}
        {activeTab === 'visitors' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-700">Recent Login Activity</h3><Button size="sm" variant="outline" onClick={fetchLogs}><RefreshCw className="w-3 h-3 mr-2"/> Refresh</Button></div><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-white"><tr><th className="px-6 py-3 text-left font-bold text-slate-500">Time</th><th className="px-6 py-3 text-left font-bold text-slate-500">User</th><th className="px-6 py-3 text-left font-bold text-slate-500">Role</th><th className="px-6 py-3 text-left font-bold text-slate-500">Country</th><th className="px-6 py-3 text-left font-bold text-slate-500">IP Address</th></tr></thead><tbody className="divide-y divide-slate-200">{logs.map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="px-6 py-3 text-slate-500">{new Date(log.login_time).toLocaleString()}</td><td className="px-6 py-3 font-medium text-slate-900">{log.user_name}</td><td className="px-6 py-3"><span className={`text-xs px-2 py-1 rounded capitalize ${log.role === 'admin' ? 'bg-purple-100 text-purple-700' : log.role === 'guest' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{log.role}</span></td><td className="px-6 py-3">{log.country ? (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">{log.country}</span>) : <span className="text-slate-300">-</span>}</td><td className="px-6 py-3 font-mono text-xs text-slate-600">{log.ip_address}</td></tr>))}</tbody></table></div>
        )}

        {/* MODAL */}
        {isModalOpen && editingStudent && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg"><div className="flex justify-between items-center p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900">Edit User</h3><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button></div><div className="p-6 space-y-4"><Input label="Full Name" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} /><Input label="Email" value={editingStudent.email} onChange={e => setEditingStudent({...editingStudent, email: e.target.value})} /><div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editingStudent.role} onChange={e => setEditingStudent({...editingStudent, role: e.target.value as any})}><option value="student">Student</option><option value="guest">Guest</option><option value="admin">Admin</option></select></div><div><Input label="Password" value={editingStudent.password || ''} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} /><div className="mt-2 flex items-start gap-2 p-2 bg-orange-50 border border-orange-100 rounded text-xs text-orange-700"><AlertTriangle className="w-4 h-4 shrink-0" /><p><strong>Important:</strong> Changing the password here only updates the database record. To allow the student to log in with this new password, you must <strong>Delete</strong> their account from the Supabase Auth Dashboard to trigger a re-registration.</p></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Profession / Bio</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editingStudent.profession || ''} onChange={e => setEditingStudent({...editingStudent, profession: e.target.value})} /></div><div className="pt-2 flex justify-end gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleModalSave}>Save Changes</Button></div></div></div></div>)}
      </div>
  );
};