// ==============================================================================
// FILE PATH: types.ts
// ==============================================================================

export type Role = 'student' | 'admin' | 'guest' | 'tester';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  password?: string;
}

export interface StudentRecord extends User {
  attendance: number;
  assignmentScores: Record<string, number>;
  profession?: string;
  notes?: string;
}

export interface CourseDay {
  id: string;
  title: string;
  day_index: number;
}

export interface CourseWeek {
  id: string;
  week_number: number;
  title: string;
  description: string;
  is_locked: boolean;
  days: CourseDay[]; // Nested days from DB join
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
  day_index?: number;
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

export interface AssignmentContent {
  id: string;
  day_index: number;
  type: 'exercise' | 'homework';
  title: string;
  description: string;
  max_score: number;
  questions: any[];
  is_locked?: boolean;
}

export interface UserAssignmentProgress {
  assignment_id: string;
  status: 'in_progress' | 'submitted';
  score: number;
  saved_answers?: Record<string, string>;
}

export interface AssignmentUI extends AssignmentContent {
  user_status?: 'in_progress' | 'submitted';
  user_score?: number;
  is_locked?: boolean;
}

export interface AppSettings {
  course_name: string;
  course_start_date: string;
  course_end_date: string;
}

export interface DeadlineItem {
  date: string;
  task: string;
  subtext: string;
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