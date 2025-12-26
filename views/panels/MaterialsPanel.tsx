// FILE: src/views/panels/MaterialsPanel.tsx

import React, { useEffect, useState } from 'react';
import { COURSE_WEEKS } from '../../data/mockData';
import { supabase } from '../../data/supabaseClient';
import { Material, User } from '../../types';
import { Lock, FileText, FileSpreadsheet, Presentation, Link as LinkIcon, Trash2, Plus, Loader2, Eye, X, ExternalLink, Download } from 'lucide-react';
import Button from '../../components/Button';

interface MaterialsPanelProps {
  user: User;
}

export const MaterialsPanel: React.FC<MaterialsPanelProps> = ({ user }) => {
  const [dynamicMaterials, setDynamicMaterials] = useState<Material[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // PREVIEW STATE
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [csvContent, setCsvContent] = useState<string[][]>([]);

  const isAdmin = user.role === 'admin';
  const isGuest = user.role === 'guest';

  // 1. Fetch Materials
  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('*');
    if (data) setDynamicMaterials(data as Material[]);
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // 2. Fetch CSV Content for Preview
  useEffect(() => {
    if (previewMaterial?.type === 'csv') {
      fetch(previewMaterial.url)
        .then(res => res.text())
        .then(text => {
           const rows = text.split('\n').filter(r => r.trim() !== '').map(row => row.split(','));
           setCsvContent(rows);
        })
        .catch(err => console.error("Failed to load CSV", err));
    }
  }, [previewMaterial]);

  // 3. Handle Upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, weekId: string, dayId: string) => {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;

    try {
      setUploadingFor(dayId);

      // A. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // B. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      // Detect Type
      let type: Material['type'] = 'link';
      if (fileExt === 'pdf') type = 'pdf';
      else if (['csv', 'xlsx'].includes(fileExt || '')) type = 'csv';
      else if (['ppt', 'pptx'].includes(fileExt || '')) type = 'slides';

      // C. Save to Database
      const { error: dbError } = await supabase.from('materials').insert({
        title: file.name,
        type: type,
        url: publicUrl,
        week_id: weekId,
        day_id: dayId
      });

      if (dbError) throw dbError;

      await fetchMaterials();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploadingFor(null);
    }
  };

  // 4. Handle Delete
  const handleDelete = async (material: Material) => {
    if (!isAdmin || !confirm('Delete this material permanently?')) return;

    try {
      const { error: dbError } = await supabase.from('materials').delete().eq('id', material.id);
      if (dbError) throw dbError;

      try {
        const urlParts = material.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName && !material.url.includes('mock')) {
             await supabase.storage.from('course-materials').remove([fileName]);
        }
      } catch (err) {
        console.warn("Could not delete file from storage bucket", err);
      }

      setDynamicMaterials(prev => prev.filter(m => m.id !== material.id));
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  // Icons Helper
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'csv': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'slides': return <Presentation className="w-5 h-5 text-orange-500" />;
      default: return <LinkIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Materials</h1>
          <p className="text-slate-600">Access lecture slides, datasets, and resources.</p>
        </div>
        {isAdmin && (
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Admin Mode
            </span>
        )}
      </header>

      <div className="space-y-8">
        {COURSE_WEEKS.map((week) => {
           const guestLock = isGuest && week.id !== 'w1';
           const isLocked = week.isLocked || guestLock;

           return (
             <div key={week.id} className={`rounded-xl border transition-all ${isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Week {week.weekNumber}</div>
                        <h3 className={`font-bold text-lg ${isLocked ? 'text-slate-500' : 'text-slate-900'}`}>{week.title}</h3>
                    </div>
                    {isLocked && <Lock className="w-5 h-5 text-slate-400" />}
                </div>

                <div className="p-0">
                    {guestLock ? (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                            <Lock className="w-8 h-8 opacity-20"/>
                            <span className="text-sm">Content locked for Guests</span>
                        </div>
                    ) : (
                        <div>
                            {week.days.map((day, idx) => {
                                const dayMaterials = dynamicMaterials.filter(m => m.day_id === day.id);

                                return (
                                   <div key={day.id} className={`p-5 ${idx !== week.days.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                      <div className="flex justify-between items-start mb-4">
                                          <h4 className="font-bold text-slate-800 flex items-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            {day.title}
                                          </h4>
                                      </div>

                                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {dayMaterials.map((mat) => (
                                            <div key={mat.id} className="relative group bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center p-3">
                                                  <div className="mr-3 p-2 bg-slate-50 rounded-md group-hover:bg-white transition-colors">
                                                      {getFileIcon(mat.type)}
                                                  </div>

                                                  <div className="flex-1 min-w-0 pr-8">
                                                      <a href={mat.url} target="_blank" rel="noreferrer" className="block">
                                                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700 transition-colors">
                                                            {mat.title}
                                                        </p>
                                                      </a>
                                                      <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">{mat.type}</p>

                                                        {/* PREVIEW BUTTON */}
                                                        <button
                                                            onClick={() => setPreviewMaterial(mat)}
                                                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center bg-blue-50 px-1.5 py-0.5 rounded"
                                                        >
                                                            <Eye className="w-3 h-3 mr-1" /> Preview
                                                        </button>

                                                        {/* DOWNLOAD BUTTON */}
                                                        {mat.type !== 'link' && (
                                                            <a
                                                                href={mat.url}
                                                                download={mat.title}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[10px] text-green-600 hover:text-green-800 hover:underline flex items-center bg-green-50 px-1.5 py-0.5 rounded"
                                                            >
                                                                <Download className="w-3 h-3 mr-1" /> Download
                                                            </a>
                                                        )}
                                                      </div>
                                                  </div>

                                                  {/* Delete Button (Admin) */}
                                                  {isAdmin && (
                                                      <button
                                                          onClick={() => handleDelete(mat)}
                                                          className="absolute top-2 right-2 p-1.5 bg-white text-slate-400 hover:text-red-600 rounded-md shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                          title="Delete Material"
                                                      >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                  )}
                                            </div>
                                        ))}

                                        {/* Upload Button (Admin) */}
                                        {isAdmin && (
                                            <div className="relative flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-pointer h-[76px]">
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => handleUpload(e, week.id, day.id)}
                                                    disabled={uploadingFor === day.id}
                                                />
                                                <div className="flex items-center text-slate-400 group-hover:text-blue-600">
                                                    {uploadingFor === day.id ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                                    ) : (
                                                        <><Plus className="w-4 h-4 mr-2" /> Add Material</>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                      </div>

                                      {!isAdmin && dayMaterials.length === 0 && (
                                          <div className="text-sm text-slate-400 italic pl-2">No materials available yet.</div>
                                      )}
                                   </div>
                                );
                            })}
                        </div>
                    )}
                </div>
             </div>
           );
        })}
      </div>

      {/* ======================= */}
      {/* PREVIEW MODAL       */}
      {/* ======================= */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2">
                        {getFileIcon(previewMaterial.type)}
                        <h3 className="font-bold text-slate-900 truncate max-w-md">{previewMaterial.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={previewMaterial.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center px-3 py-1.5 rounded-lg hover:bg-blue-50"
                        >
                            <ExternalLink className="w-4 h-4 mr-1" /> Open Original
                        </a>
                        <button
                            onClick={() => { setPreviewMaterial(null); setCsvContent([]); }}
                            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">

                    {/* PDF PREVIEW */}
                    {previewMaterial.type === 'pdf' && (
                        <iframe
                            src={`${previewMaterial.url}#toolbar=0`}
                            className="w-full h-full rounded-lg shadow-sm bg-white"
                            title="PDF Preview"
                        />
                    )}

                    {/* CSV PREVIEW (Table) */}
                    {previewMaterial.type === 'csv' && (
                        <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-auto p-4 items-start justify-start block">
                            {csvContent.length > 0 ? (
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {csvContent[0].map((header, i) => (
                                                <th key={i} className="border-b-2 border-slate-200 p-2 font-bold text-slate-700 bg-slate-50 sticky top-0">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvContent.slice(1).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="p-2 text-slate-600 border-r border-slate-100 last:border-0 truncate max-w-[200px]">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center mt-20 text-slate-400 flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    Loading data...
                                </div>
                            )}
                        </div>
                    )}

                    {/* SLIDES / IMAGES */}
                    {(previewMaterial.type === 'slides' || previewMaterial.title.match(/\.(jpeg|jpg|png|gif)$/i)) ? (
                        <img
                            src={previewMaterial.url}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded shadow-lg"
                        />
                    ) : null}

                    {/* GENERIC / LINK FALLBACK */}
                    {previewMaterial.type === 'link' && (
                        <div className="text-center p-10 bg-white rounded-xl shadow-sm">
                            <LinkIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">External Link</h3>
                            <p className="text-slate-500 mb-6 max-w-xs mx-auto">This content cannot be embedded directly. Please open it in a new tab.</p>
                            <Button onClick={() => window.open(previewMaterial.url, '_blank')}>
                                Open Link
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};