import { Assignment, CourseWeek, PracticeQuestion, StudentRecord, Announcement } from "../types";

// Configuration
export const COURSE_NAME = "Intro to Python Programming";
export const COURSE_START_DATE = "2025-12-08";
export const COURSE_END_DATE = "2026-01-30";

// Initial Announcements
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "Welcome to Class!",
    message: "Welcome to Intro to Python! Make sure to check the Course Material tab for the syllabus and first week slides. The Practice Arena is open for warm-up questions.",
    date: "2025-12-08",
    author: "Admin"
  },
  {
    id: "2",
    title: "Week 1 Homework Due",
    message: "Don't forget to submit your Variables & Data Types homework by Friday midnight. Use the new 'Pre-Check' feature to verify your code before submitting.",
    date: "2025-12-10",
    author: "Admin"
  },
  {
    id: "3",
    title: "System Maintenance",
    message: "The practice arena will be undergoing brief maintenance on Saturday at 2 AM EST. Please save your work.",
    date: "2025-12-12",
    author: "IT Support"
  }
];

// Mock Database of Students
export const MOCK_STUDENTS: StudentRecord[] = [
  {
    id: "0",
    name: "demo",
    email: "demo@student.com",
    role: "student",
    password: "demo",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Demo"
  },
  {
    id: "1",
    name: "Bassant Mansour",
    email: "basantmansour@aucegypt.edu",
    role: "student",
    password: "basantmansour@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bassant&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "2",
    name: "Xena Hassan",
    email: "xenaragy@gmail.com",
    role: "student",
    password: "xenaragy@gmail.com",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xena&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "3",
    name: "Abdelrahman Amer",
    email: "abdelrahmanamer@aucegypt.edu",
    role: "student",
    password: "abdelrahmanamer@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abdelrahman&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "4",
    name: "Rahaf Nour",
    email: "rahafnour@aucegypt.edu",
    role: "student",
    password: "rahafnour@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahaf&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "5",
    name: "Ayad Gomaa",
    email: "ayadgomaa@aucegypt.edu",
    role: "student",
    password: "ayadgomaa@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayad&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
    {
    id: "6",
    name: "Nadine Elgarem",
    email: "nadineelgarem@aucegypt.edu",
    role: "student",
    password: "nadineelgarem@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nadine&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "7",
    name: "Ahmed Kamal",
    email: "ahmedkamall@aucegypt.edu",
    role: "student",
    password: "ahmedkamall@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "8",
    name: "Ahmad ElKattan",
    email: "ahmadelkattan@aucegypt.edu",
    role: "student",
    password: "ahmadelkattan@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "9",
    name: "Mariham Takla",
    email: "marihamfarouk@aucegypt.edu",
    role: "student",
    password: "marihamfarouk@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mariham&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "10",
    name: "Menan Elhennawy",
    email: "menanelhennawy@aucegypt.edu",
    role: "student",
    password: "menanelhennawy@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Menan&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "11",
    name: "George Botros",
    email: "georgerafik234@gmail.com",
    role: "student",
    password: "georgerafik234@gmail.com",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abdelrahman&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "12",
    name: "Manuel Echave",
    email: "echave.manuel@hotmail.com",
    role: "student",
    password: "echave.manuel@hotmail.com",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manuel&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Netherlands"
  },
  {
    id: "13",
    name: "Marim Lashin",
    email: "mariam.lashin@aucegypt.edu",
    role: "student",
    password: "mariam.lashin@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mariam&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "14",
    name: "Osama barghash",
    email: "ossamahesham@aucegypt.edu",
    role: "student",
    password: "ossamahesham@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Osama&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "15",
    name: "Fares Eltanbouly",
    email: "faresmahmoud@aucegypt.edu",
    role: "student",
    password: "faresmahmoud@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fares&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "16",
    name: "Lana Beshir",
    email: "lanabeshir@aucegypt.edu",
    role: "student",
    password: "lanabeshir@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lana&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "17",
    name: "Anna Waldeck",
    email: "a.c.waldeck@tilburguniversity.edu",
    role: "student",
    password: "a.c.waldeck@tilburguniversity.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Netherlands"
  },
  {
    id: "18",
    name: "Aliaa Hussein",
    email: "aliaahussein@aucegypt.edu",
    role: "student",
    password: "aliaahussein@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aliaa&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "19",
    name: "Steven Youssef",
    email: "stevenyoussef@aucegypt.edu",
    role: "student",
    password: "stevenyoussef@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Steven&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
  {
    id: "20",
    name: "Karen Kamal",
    email: "kkamal05@aucegypt.edu",
    role: "student",
    password: "kkamal05@aucegypt.edu",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karen&mouth=smile&eyebrows=defaultNatural",
    attendance: 0,
    assignmentScores: {},
    profession: "",
    notes: "Country: Egypt"
  },
];


// Course Structure (Weeks > Days > Materials)
export const COURSE_WEEKS: CourseWeek[] = [
  { 
    id: "w1", weekNumber: 1, title: "Variables & Data Types", description: "Integers, Floats, Strings, and Booleans.", isLocked: false, 
    days: [
      {
        id: "w1d1", title: "Day 1: Introduction", 
        materials: [
          { id: "m1", title: "Lecture Slides: Intro", type: "slides", url: "#" },
          { id: "m2", title: "Setup Guide.pdf", type: "pdf", url: "#" }
        ]
      },
      {
        id: "w1d2", title: "Day 2: Basic Types",
        materials: [
          { id: "m3", title: "Data Types Cheatsheet", type: "pdf", url: "#" },
          { id: "m4", title: "practice_data.csv", type: "csv", url: "#" }
        ]
      }
    ]
  },
  { 
    id: "w2", weekNumber: 2, title: "Control Flow & Logic", description: "If/Else statements and logic gates.", isLocked: false, 
    days: [
      {
        id: "w2d1", title: "Day 1: Conditionals", 
        materials: [
           { id: "m5", title: "Logic Tables", type: "pdf", url: "#" }
        ]
      }
    ]
  },
  { 
    id: "w3", weekNumber: 3, title: "Loops & Iteration", description: "For loops and While loops.", isLocked: true, 
    days: [] 
  },
  { 
    id: "w4", weekNumber: 4, title: "Functions", description: "Defining and calling functions.", isLocked: true, 
    days: [] 
  },
  { 
    id: "w5", weekNumber: 5, title: "Data Structures", description: "Lists, Dictionaries, and Sets.", isLocked: true, 
    days: [] 
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
    solution: "Big", // Simplified match for MVP
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