import React from 'react';
import { COURSE_WEEKS } from '../../data/mockData';
import { FileText, Lock, Unlock, Folder, File, Download } from 'lucide-react';
import Button from '../../components/Button';

export const MaterialsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Course Materials</h1>
        <p className="text-slate-600">Access lecture slides, datasets, and reference guides.</p>
      </header>

      <div className="space-y-6">
        {COURSE_WEEKS.map((week) => (
          <div key={week.id} className={`rounded-xl border transition-all overflow-hidden ${week.isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
            
            {/* Week Header */}
            <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${week.isLocked ? 'bg-slate-100' : 'bg-slate-50'}`}>
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${week.isLocked ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                    {week.isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${week.isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                      Week {week.weekNumber}: {week.title}
                    </h3>
                    <p className="text-xs text-slate-500">{week.description}</p>
                  </div>
               </div>
            </div>

            {/* Days & Materials */}
            {!week.isLocked && (
              <div className="p-4 space-y-4">
                {week.days.length === 0 && <p className="text-sm text-slate-400 italic p-2">Materials coming soon...</p>}
                
                {week.days.map(day => (
                  <div key={day.id} className="ml-2 border-l-2 border-slate-200 pl-4 pb-2">
                     <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-slate-300 rounded-full -ml-[21px] mr-3"></span>
                        {day.title}
                     </h4>
                     
                     <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                       {day.materials.map(material => (
                         <a 
                           key={material.id} 
                           href={material.url}
                           onClick={(e) => { e.preventDefault(); alert(`Downloading ${material.title}...`); }}
                           className="flex items-center p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group cursor-pointer"
                         >
                            <div className={`p-2 rounded mr-3 ${
                              material.type === 'pdf' ? 'bg-red-100 text-red-600' :
                              material.type === 'csv' ? 'bg-green-100 text-green-600' :
                              material.type === 'slides' ? 'bg-orange-100 text-orange-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                               {material.type === 'pdf' ? <FileText className="w-4 h-4" /> :
                                material.type === 'csv' ? <DatabaseIcon className="w-4 h-4" /> :
                                <File className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="text-sm font-medium text-slate-900 truncate">{material.title}</div>
                               <div className="text-xs text-slate-500 uppercase">{material.type}</div>
                            </div>
                            <Download className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                         </a>
                       ))}
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);