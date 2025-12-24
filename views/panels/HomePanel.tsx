import React, { useState } from 'react';
import { StudentRecord, Announcement } from '../../types';
import { Clock, Calendar, AlertCircle, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { COURSE_NAME, COURSE_END_DATE } from '../../data/mockData';
import Button from '../../components/Button';

interface HomePanelProps {
  user: StudentRecord;
  announcements: Announcement[];
}

export const HomePanel: React.FC<HomePanelProps> = ({ user, announcements }) => {
  // Safe access to assignment scores
  const scores = user.assignmentScores || {};
  const scoreValues = Object.values(scores);
  
  // Calculate average, default to 0 if no scores
  const averageScore = scoreValues.length > 0 
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) 
    : 0;

  // Carousel State
  const [currentAnnIndex, setCurrentAnnIndex] = useState(0);
  const carouselItems = announcements.slice(0, 3); // Max 3 items

  const nextAnnouncement = () => {
    setCurrentAnnIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const prevAnnouncement = () => {
    setCurrentAnnIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <p className="text-slate-600">{COURSE_NAME}</p>
      </header>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Attendance</p>
            <p className="text-2xl font-bold text-slate-900">{user.attendance || 0}%</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Current Score</p>
            <p className="text-2xl font-bold text-slate-900">
              {averageScore}/100
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Course Ends</p>
            <p className="text-lg font-bold text-slate-900">{COURSE_END_DATE}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Recent Activity & Carousel */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Next Deadlines</h3>
          </div>
          <div className="p-6">
             <div className="flex items-start space-x-4 mb-4">
                <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded text-center min-w-[60px]">
                   DEC 8
                </div>
                <div>
                   <p className="font-medium text-slate-900">Variables Homework</p>
                   <p className="text-sm text-slate-500">Due by 11:59 PM</p>
                </div>
             </div>
             <div className="flex items-start space-x-4">
                <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded text-center min-w-[60px]">
                   DEC 9
                </div>
                <div>
                   <p className="font-medium text-slate-900">Control Flow Exercise</p>
                   <p className="text-sm text-slate-500">Due by 11:59 PM</p>
                </div>
             </div>
          </div>
        </div>

        {/* Announcement Carousel */}
        <div className="flex flex-col h-full">
           {carouselItems.length > 0 ? (
             <div className="relative rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 shadow-md flex-1 flex flex-col justify-between overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                     <h3 className="font-bold text-lg flex items-center">
                        <Megaphone className="w-5 h-5 mr-2" />
                        Announcement
                     </h3>
                     <span className="bg-blue-500/30 px-2 py-1 rounded text-xs">
                        {currentAnnIndex + 1} / {carouselItems.length}
                     </span>
                  </div>
                  
                  <div className="min-h-[100px] animate-fade-in" key={carouselItems[currentAnnIndex].id}>
                     <h4 className="text-xl font-bold mb-2">{carouselItems[currentAnnIndex].title}</h4>
                     <p className="text-blue-100 text-sm leading-relaxed">
                       {carouselItems[currentAnnIndex].message}
                     </p>
                     <div className="flex items-center text-xs text-blue-200 mt-4">
                        <span className="font-semibold mr-2">{carouselItems[currentAnnIndex].author}</span>
                        <span>• {carouselItems[currentAnnIndex].date}</span>
                     </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 z-10">
                   <button onClick={prevAnnouncement} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <button onClick={nextAnnouncement} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
             </div>
           ) : (
             <div className="rounded-xl bg-white p-6 border border-slate-200 text-center text-slate-500 h-full flex items-center justify-center">
                No announcements at this time.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};