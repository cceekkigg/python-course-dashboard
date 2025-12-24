import React, { useState } from 'react';
import { ASSIGNMENTS_DB } from '../../data/mockData';
import { StudentRecord, Assignment, Announcement } from '../../types';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { Search, Edit2, Save, X, User as UserIcon, BookOpen, Key, Bell, Trash2, Server, Database, Code, Shield, FileText as FileIcon, HelpCircle, Terminal } from 'lucide-react';

interface AdminPanelProps {
  announcements: Announcement[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  announcements, 
  onAddAnnouncement, 
  onDeleteAnnouncement,
  students,
  onUpdateStudents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'announcements' | 'specs' | 'dbguide'>('students');
  
  // Editing State
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Announcement State
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');

  // Collect all homework assignments for the gradebook columns
  const allHomeworks: Assignment[] = Object.values(ASSIGNMENTS_DB)
    .flat()
    .filter(a => a.type === 'homework');

  const handleEditClick = (student: StudentRecord) => {
    setEditingStudent({ ...student }); // Clone to avoid direct mutation
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    if (!editingStudent) return;
    
    // Update via parent prop to ensure persistence
    const updatedStudents = students.map(s => s.id === editingStudent.id ? editingStudent : s);
    onUpdateStudents(updatedStudents);

    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleScoreChange = (assignId: string, scoreStr: string) => {
    if (!editingStudent) return;
    const score = parseInt(scoreStr) || 0;
    setEditingStudent({
      ...editingStudent,
      assignmentScores: {
        ...editingStudent.assignmentScores,
        [assignId]: score
      }
    });
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnMsg) return;

    const newAnn: Announcement = {
      id: Date.now().toString(),
      title: newAnnTitle,
      message: newAnnMsg,
      date: new Date().toLocaleDateString(),
      author: 'Admin'
    };

    onAddAnnouncement(newAnn);
    setNewAnnTitle('');
    setNewAnnMsg('');
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">Manage student access, grading, and records.</p>
        </div>
        <div className="flex gap-4">
           {activeTab === 'students' && (
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
           )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Student Management
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'announcements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Announcements
        </button>
        <button 
          onClick={() => setActiveTab('specs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'specs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          System Architecture
        </button>
        <button 
          onClick={() => setActiveTab('dbguide')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dbguide' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Database Guide
        </button>
      </div>

      {activeTab === 'students' ? (
        /* Student Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Profession</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center mr-3 text-xs font-bold text-slate-600">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.email}</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        student.attendance >= 90 ? 'bg-green-100 text-green-800' : 
                        student.attendance >= 75 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.attendance}%
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {student.profession || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     <Button size="sm" variant="outline" onClick={() => handleEditClick(student)}>
                       <Edit2 className="w-3 h-3 mr-1" /> Edit
                     </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'announcements' ? (
        /* Announcement Manager */
        <div className="grid md:grid-cols-3 gap-6">
           {/* Create New */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                <Bell className="w-4 h-4 mr-2" /> Make New Announcement
              </h3>
              <form onSubmit={handlePostAnnouncement} className="space-y-4">
                <Input 
                  label="Title" 
                  placeholder="e.g. Class Cancelled" 
                  value={newAnnTitle}
                  onChange={e => setNewAnnTitle(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea 
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    rows={4}
                    placeholder="Enter your message here..."
                    value={newAnnMsg}
                    onChange={e => setNewAnnMsg(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" fullWidth>Post Announcement</Button>
              </form>
           </div>

           {/* List */}
           <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-slate-900">Active Announcements</h3>
              {announcements.length === 0 && <p className="text-slate-500 italic">No announcements posted.</p>}
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start">
                   <div>
                      <h4 className="font-bold text-slate-900">{ann.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{ann.message}</p>
                      <div className="text-xs text-slate-400 mt-2">Posted on {ann.date} by {ann.author}</div>
                   </div>
                   <button 
                     onClick={() => onDeleteAnnouncement(ann.id)}
                     className="text-red-400 hover:text-red-600 p-1"
                     title="Delete"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
        </div>
      ) : activeTab === 'specs' ? (
        /* System Specs / Architecture Tab */
        <div className="space-y-6">
           <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
             <h2 className="text-2xl font-bold text-slate-900 mb-6">Technical Architecture Specification</h2>
             <p className="text-slate-600 mb-8 max-w-3xl">
               The following specifications outline the core infrastructure and design patterns used in this Course Dashboard. 
               This architecture ensures scalability, security, and interactive capabilities for online Python testing.
             </p>

             <div className="grid gap-6 md:grid-cols-2">
                
                {/* 1. App Framework */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3"><Server className="w-5 h-5" /></div>
                    <h3 className="font-bold text-slate-900">Application Framework & Hosting</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Built using TypeScript and Next.js (simulated). Hosted on Vercel to utilize serverless infrastructure, 
                    ensuring zero server maintenance and high scalability during high-traffic course periods.
                  </p>
                </div>

                {/* 2. Database */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg mr-3"><Database className="w-5 h-5" /></div>
                    <h3 className="font-bold text-slate-900">Database & Authentication</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Powered by Supabase (PostgreSQL) for secure data storage. Handles student authentication and maintains 
                    relational data for attendance, grades, and role-based access control (RBAC).
                  </p>
                </div>

                {/* 3. Python Engine */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 border-l-4 border-l-yellow-400">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg mr-3"><Code className="w-5 h-5" /></div>
                    <h3 className="font-bold text-slate-900">Interactive Python (Pyodide)</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The "Practice Arena" utilizes Client-Side Execution via Pyodide (WebAssembly). This allows students 
                    to execute Python code securely in their own browser without sending arbitrary code to the backend server.
                  </p>
                </div>

                {/* 4. Security */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg mr-3"><Shield className="w-5 h-5" /></div>
                    <h3 className="font-bold text-slate-900">Access Control & Security</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Operates on a "Private by Default" model using Middleware. Any request without a valid session token 
                    is immediately redirected to the login gateway, ensuring course content remains exclusive to enrolled students.
                  </p>
                </div>

                {/* 5. Materials */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3"><FileIcon className="w-5 h-5" /></div>
                    <h3 className="font-bold text-slate-900">Materials Management</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Static resources (slides/PDFs) are served via a time-release content delivery system. 
                    Frontend logic validates the current date against the syllabus schedule to automatically unlock modules.
                  </p>
                </div>

             </div>
           </div>
        </div>
      ) : (
        /* Database Guide Tab */
        <div className="space-y-6">
           <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-center mb-6">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mr-3">
                    <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Database Administration Guide</h2>
                    <p className="text-slate-600">Structure and update procedures for the Student Database.</p>
                </div>
             </div>

             <div className="space-y-8">
                
                {/* 1. Schema */}
                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                        Data Structure (Schema)
                    </h3>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                        <p className="text-slate-400 mb-2">// Supabase Table: public.students</p>
                        <pre>{`{
  id: uuid (Primary Key),
  email: varchar(255) (Unique),
  name: varchar(255),
  role: 'student' | 'admin',
  password_hash: varchar(255), // Encrypted
  attendance_pct: integer (0-100),
  assignment_scores: jsonb, // { "hw-1": 95, "ex-2": 100 }
  metadata: jsonb // { "profession": "...", "notes": "..." }
}`}</pre>
                    </div>
                    <p className="text-sm text-slate-600">
                        The database uses a flexible <code>jsonb</code> column for assignment scores to allow for dynamic addition of new assignments without altering the table schema.
                    </p>
                </section>

                <div className="border-t border-slate-100"></div>

                {/* 2. Update Guide */}
                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                        Updating Rows
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-sm text-slate-800 mb-2">Via Admin Dashboard (Recommended)</h4>
                            <p className="text-sm text-slate-600 mb-2">
                                For most updates (grades, attendance, bio), use the <strong>Student Management</strong> tab in this panel.
                            </p>
                            <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                                <li>Navigate to "Student Management".</li>
                                <li>Click "Edit" next to the target student.</li>
                                <li>Modify fields in the modal popup.</li>
                                <li>Click "Save Changes" to persist.</li>
                            </ol>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-sm text-slate-800 mb-2">Via SQL / Supabase Console</h4>
                            <p className="text-sm text-slate-600 mb-2">
                                For bulk updates or schema changes:
                            </p>
                            <div className="bg-slate-800 p-2 rounded text-xs text-white font-mono">
                                UPDATE public.students <br/>
                                SET attendance_pct = 100 <br/>
                                WHERE email LIKE '%@student.com';
                            </div>
                        </div>
                    </div>
                </section>

                <div className="border-t border-slate-100"></div>

                 {/* 3. Password Reset */}
                 <section className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">3</span>
                        Password Management
                    </h3>
                    <p className="text-sm text-slate-600">
                        <strong>Default Password:</strong> All new student accounts are initialized with the password <code>123456</code>.
                    </p>
                    <div className="flex items-start gap-2 text-sm text-slate-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <Terminal className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            Students are prompted to change their password upon first login via their Profile Settings modal (accessible by clicking the gear icon next to their name in the sidebar).
                        </div>
                    </div>
                </section>

             </div>
           </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Edit Student Record</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Account Info */}
              <section className="space-y-4">
                <h3 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wide">
                  <Key className="w-4 h-4 mr-2" /> Account & Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Full Name" 
                    value={editingStudent.name} 
                    onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} 
                  />
                  <Input 
                    label="Password" 
                    value={editingStudent.password || ''} 
                    onChange={e => setEditingStudent({...editingStudent, password: e.target.value})} 
                  />
                </div>
              </section>

              <div className="border-t border-slate-100"></div>

              {/* Profile Info */}
              <section className="space-y-4">
                <h3 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wide">
                  <UserIcon className="w-4 h-4 mr-2" /> Profile Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Attendance (%)" 
                    type="number" 
                    value={editingStudent.attendance} 
                    onChange={e => setEditingStudent({...editingStudent, attendance: parseInt(e.target.value) || 0})} 
                  />
                  <Input 
                    label="Profession" 
                    value={editingStudent.profession || ''} 
                    onChange={e => setEditingStudent({...editingStudent, profession: e.target.value})} 
                  />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea 
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                      rows={3}
                      value={editingStudent.notes || ''}
                      onChange={e => setEditingStudent({...editingStudent, notes: e.target.value})}
                    />
                  </div>
                </div>
              </section>

              <div className="border-t border-slate-100"></div>

              {/* Grades */}
              <section className="space-y-4">
                <h3 className="flex items-center text-sm font-bold text-slate-900 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 mr-2" /> Gradebook
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allHomeworks.map(hw => (
                    <div key={hw.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-500 mb-1 truncate" title={hw.title}>
                        {hw.title}
                      </label>
                      <div className="flex items-center">
                        <input 
                          type="number"
                          className="w-full rounded border border-slate-300 p-1 text-sm mr-2"
                          value={editingStudent.assignmentScores[hw.id] || 0}
                          onChange={e => handleScoreChange(hw.id, e.target.value)}
                        />
                        <span className="text-xs text-slate-400">/{hw.maxScore}</span>
                      </div>
                    </div>
                  ))}
                  {allHomeworks.length === 0 && <p className="text-sm text-slate-500 italic">No homework assignments found.</p>}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleModalSave}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};