# PyPathway - Python Course Dashboard

[![React](https://img.shields.io/badge/React-19-blue?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Pyodide](https://img.shields.io/badge/Pyodide-WASM-FFD43B?logo=python&logoColor=black)](https://pyodide.org/)

**Live Demo:** [https://python-course-dashboard.vercel.app/](https://python-course-dashboard.vercel.app/)

## 📖 Project Overview

**PyPathway** is a robust, full-stack educational dashboard designed to facilitate an "Introduction to Python" course. It provides a seamless environment for students to learn, practice, and track their progress, while offering administrators powerful tools to manage content and monitor student performance.

This project differentiates itself by leveraging **Client-Side Python Execution (via Pyodide/WASM)**, allowing for instant code feedback, secure sandboxing, and zero-latency grading without heavy backend computation costs.

### Key Features

#### 🎓 Student Experience
* **Interactive Coding Environment:** Integrated code editor with client-side Python runtime (WASM).
* **Practice Arena:** Infinite practice mode with automated grading, test cases, and an XP/Gamification system.
* **Course Roadmap:** Week-by-week content unlocking, including lecture materials (PDF, Slides) and homework assignments.
* **Progress Tracking:** Visual dashboards for attendance, assignment scores, and upcoming deadlines.
* **Demo Mode:** Guest access for prospective students to try the platform with limited permissions.

#### 🛡️ Admin Control Center
* **User Management:** Roster management, role assignment (Admin/Student/Guest), and access logs.
* **Content Management:** Upload course materials, manage announcements, and toggle content visibility.
* **Gradebook:** View and edit student attendance and assignment scores.
* **Settings:** Configure global course settings (dates, deadlines).

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Backend / Persistence:** Supabase (PostgreSQL, Auth, Storage)
* **Runtime:** Pyodide (Python 3.10 compiled to WebAssembly)
* **Utilities:** `xlsx` (Data processing), `recharts` (Visualization)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn
* A Supabase project

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/python-course-dashboard.git](https://github.com/your-username/python-course-dashboard.git)
    cd python-course-dashboard
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory and add your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```
    The application will launch at `http://localhost:3000`.

---

## 🗄️ Database Schema (Supabase)

The application relies on the following PostgreSQL tables in Supabase:

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `users` | Custom roster table linked to Auth. | `id`, `email`, `role`, `auth_id`, `assignmentScores`, `attendance` |
| `announcements` | Course news feed. | `id`, `title`, `message`, `is_active`, `date` |
| `materials` | Course resources (PDFs, Links). | `id`, `title`, `type`, `url`, `week_id`, `day_id` |
| `content_assignments` | Metadata for Homework/Exercises. | `id`, `day_index`, `type`, `questions` (JSON), `is_locked` |
| `user_assignment_progress` | Student submissions & scores. | `user_id`, `assignment_id`, `score`, `status`, `saved_answers` |
| `practice_questions` | Question bank for the Arena. | `id`, `topic`, `difficulty`, `starter_code`, `test_cases` (JSON) |
| `user_practice_progress` | Gamification stats (XP). | `user_id`, `total_score`, `solved_ids` |
| `access_logs` | Security & Login tracking. | `id`, `user_id`, `ip_address`, `country`, `login_time` |
| `app_settings` | Global config keys. | `key`, `value` (JSON) |

> **Note:** The application uses a "Lazy Linking" authentication strategy. Users are first created in the `users` table (the roster). Upon their first login via Supabase Auth, their secure UUID is linked to their roster entry.

---

## 🏗️ Architecture Highlights

### 1. Client-Side Auto-Grading (Pyodide)
Unlike traditional platforms that send code to a backend container for execution, PyPathway uses **Pyodide**. This allows the browser to download a lightweight Python environment.
* **Benefit:** Zero server costs for code execution.
* **Benefit:** Instantaneous feedback for students.
* **Security:** Code runs in the browser sandbox, preventing server-side malicious execution.

### 2. Optimistic UI Updates
The application employs optimistic state updates for high responsiveness. When a user submits an assignment or updates settings, the UI reflects the change immediately while the database update happens asynchronously in the background.

### 3. Role-Based Access Control (RBAC)
The frontend implements strict view protection based on the user object:
* **Admin:** Full access to all panels and write permissions.
* **Student:** Read access to content; Write access only to their own progress rows.
* **Guest:** Read-only access to Week 1 content; persistence is disabled.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---