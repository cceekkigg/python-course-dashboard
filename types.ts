// ==============================================================================
// FILE PATH: types.ts
// ==============================================================================

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
  attendance: number; // Percentage or Count depending on usage (0-15)
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
  content: string;
  hint?: string;
  expectedOutput?: string;
  testCases?: TestCase[];
}

export interface PracticeQuestion {
  id: string;
  topicId: string;
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

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'csv' | 'slides'  | 'png' | 'link';
  url: string;
  week_id?: string;
  day_id?: string;
}

export interface TestCase {
  inputs: string[]; // For input() mocking
  expected: string;
}

export interface UserProgress {
  user_id: string;
  total_score: number;
  total_count: number;
  level_counts: Record<string, number>;
  topic_counts: Record<string, number>;
  solved_ids: string[];
}

export interface PracticeQuestion {
  id: string;
  topic: string;
  title: string;
  description: string;
  difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'challenge';
  score_value: number;
  input_mode: 'none' | 'single' | 'multiple';
  starter_code: string;
  solution_code: string;
  test_cases: TestCase[]; // Ensure TestCase is defined
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

// Pyodide Type Definitions
export interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<any>;
  setStdout: (options: { batched: (msg: string) => void }) => void;
}