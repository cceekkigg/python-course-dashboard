import { Assignment, CourseWeek, PracticeQuestion, Announcement } from "../types";

// ==============================================================================
// CONFIGURATION constants
// ==============================================================================
export const COURSE_NAME = "Intro to Python Programming";
export const COURSE_START_DATE = "2025-12-08";
export const COURSE_END_DATE = "2026-01-30";

// Initial Announcements (Static fallback)
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "Welcome to Class!",
    message: "Welcome to Intro to Python! Make sure to check the Course Material tab for the syllabus and first week slides.",
    date: "2025-12-08",
    author: "Admin"
  },
  {
    id: "2",
    title: "Week 1 Homework Due",
    message: "Don't forget to submit your Variables & Data Types homework by Friday midnight.",
    date: "2025-12-10",
    author: "Admin"
  }
];

// ==============================================================================
// STUDENT DATA
// (Removed! Now fetched from Supabase)
// ==============================================================================
// export const MOCK_STUDENTS = ... [DELETED]


// ==============================================================================
// COURSE CONTENT (Static)
// ==============================================================================

// Course Structure (Weeks > Days > Materials)
export const COURSE_WEEKS: CourseWeek[] = [
  {
    id: "w1", weekNumber: 1, title: "Preparation Week",
    description: "", isLocked: false,
    days: [
      {
        id: "w1d1", title: "Course Preparation Guide",
        materials: []
      },
    ]
  },
  {
    id: "w2", weekNumber: 2, title: "Control Flow & Logic",
    description: "Functions, Classes, modules", isLocked: true,
    days: [
      {
        id: "w2d1", title: "Day 1: Basic Grammar",
        materials: []
      },
      {
        id: "w2d2", title: "Day 2: Data Type & Operation I",
        materials: []
      },
      {
        id: "w2d3", title: "Day 3: Data Type & Operation II",
        materials: []
      },
      {
        id: "w2d4", title: "Day 4: Debugging & File Operation",
        materials: []
      },
      {
        id: "w2d5", title: "Day 5: For-loop for More",
        materials: []
      }
    ]
  },
  {
    id: "w3", weekNumber: 3, title: "Loops & Iteration",
    description: "For loops and While loops.", isLocked: true,
    days: [
      {
        id: "w3d1", title: "Day 1: Code Reuse I",
        materials: []
      },
      {
        id: "w3d2", title: "Day 2: Code Reuse II",
        materials: []
      },
      {
        id: "w3d3", title: "Day 3: Code Reuse III",
        materials: []
      },
      {
        id: "w3d4", title: "Day 4: Data Analysis Modules",
        materials: []
      },
      {
        id: "w3d5", title: "Day 4: Data Visualization Modules",
        materials: []
      }
    ]
  },
  {
    id: "w4", weekNumber: 4, title: "Functions",
    description: "Defining and calling functions.", isLocked: true,
    days: [
      {
        id: "w4d1", title: "Day 1: Basic Scraping",
        materials: []
      },
      {
        id: "w4d2", title: "Day 2: AI-Assisted Programming",
        materials: []
      },
      {
        id: "w4d3", title: "Day 3: [optional] Final Project",
        materials: []
      },
      {
        id: "w4d4", title: "Day 4: [optional] Final Project",
        materials: []
      },
      {
        id: "w4d5", title: "Guest Talk",
        materials: []
      }]
  },

];

// Practice Questions
export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: "p1", topicId: "w1", points: 10, difficulty: "easy",
    question: "Print the string 'Python is fun' exactly as shown.",
    starterCode: "# Write your print statement here\n",
    solution: "print('Python is fun')",
    expectedOutput: "Python is fun"
  },
  {
    id: "p2", topicId: "w2", points: 20, difficulty: "medium",
    question: "Create a variable x = 10. If x is greater than 5, print 'Big', otherwise print 'Small'.",
    starterCode: "x = 10\n# Write your if statement\n",
    solution: "Big",
    expectedOutput: "Big"
  },
  {
    id: "p3", topicId: "w3", points: 30, difficulty: "hard",
    question: "Calculate 5 + 7 and print the result.",
    starterCode: "# Add numbers\n",
    solution: "12",
    expectedOutput: "12"
  }
];

// Helper to generate assignments
const generateAssignments = (): Record<string, Assignment[]> => {
  const db: Record<string, Assignment[]> = {};
  const startDate = new Date(COURSE_START_DATE);

  // Generate for 21 days
  for (let i = 0; i < 21; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (0 = Sun, 6 = Sat)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    db[dateStr] = [
      {
        id: `ex-${i+1}`,
        date: dateStr,
        type: 'exercise',
        title: `Day ${i+1} Exercise`,
        maxScore: 0,
        description: "Complete the daily coding warmup.",
        questions: [
          { id: `q1-${i}`, type: 'markdown', content: `### Warmup\nPrint the number ${i+1}.` },
          { id: `q2-${i}`, type: 'code', content: `print(${i+1})`, expectedOutput: `${i+1}` }
        ]
      },
      {
        id: `hw-${i+1}`,
        date: dateStr,
        type: 'homework',
        title: `Day ${i+1} Homework`,
        maxScore: 100,
        description: "Solve the daily challenge problem. The grading system will run 10 checks against your solution.",
        questions: [
           { id: `hq1-${i}`, type: 'markdown', content: "### Challenge\nImplement the function below." },
           { 
             id: `hq2-${i}`, 
             type: 'code', 
             content: "def solve():\n    return True", 
             testCases: [ { input: "solve()", expected: "True" } ]
           }
        ]
      }
    ];
  }
  return db;
};

// Assignments
export const ASSIGNMENTS_DB: Record<string, Assignment[]> = generateAssignments();