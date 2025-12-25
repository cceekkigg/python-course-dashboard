export type Role = 'student' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  password?: string; // For demo/admin purposes
}

export interface StudentRecord extends User {
  attendance: number; // Percentage
  assignmentScores: Record<string, number>; // assignmentId -> score
  profession?: string;
  notes?: string;
}

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'csv' | 'slides' | 'link';
  url: string;
}

export interface CourseDay {
  id: string;
  title: string;
  materials: Material[];
}

export interface CourseWeek {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  days: CourseDay[];
  isLocked: boolean;
}

export interface TestCase {
  input: string;
  expected: string;
}

export interface Assignment {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'exercise' | 'homework';
  title: string;
  description: string;
  questions: NotebookCell[];
  maxScore: number;
}

export interface NotebookCell {
  id: string;
  type: 'markdown' | 'code';
  content: string; // The question or the code starter
  hint?: string;
  expectedOutput?: string;
  testCases?: TestCase[]; // For auto-grading simulation
}

export interface PracticeQuestion {
  id: string;
  topicId: string; // Links to CourseWeek ID
  points: number;
  question: string;
  starterCode: string;
  solution: string; 
  expectedOutput: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  author: string;
  is_active?: boolean;
}

export interface AccessLog {
  id: string;
  user_name: string;
  role: string;
  ip_address: string;
  login_time: string;
}

export enum DashboardViewType {
  HOME = 'HOME',
  MATERIALS = 'MATERIALS',
  PRACTICE = 'PRACTICE',
  ASSIGNMENTS = 'ASSIGNMENTS',
  ADMIN = 'ADMIN',
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
}