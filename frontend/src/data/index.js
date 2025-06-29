// src/data/index.js

// -- Users (for Directory & Profiles) --
export const users = [
  {
    id: 'u123',
    name: 'Alice Manager',
    role: 'manager',
    team: 'Sales',
    skills: ['Leadership', 'Strategy']
  },
  {
    id: 'u124',
    name: 'Bob Specialist',
    role: 'employee',
    team: 'Sales',
    skills: ['Negotiation', 'CRM']
  },
  {
    id: 'u125',
    name: 'Carol Analyst',
    role: 'analyst',
    team: 'IT',
    skills: ['SQL', 'Python']
  },
  {
    id: 'u126',
    name: 'David Developer',
    role: 'employee',
    team: 'IT',
    skills: ['React', 'Node.js']
  }
];

// -- Goals (for all pages) --
export const allGoals = [
  { id: 'g1', title: 'Monthly Sales Target',      target: 500000, unit: '$',        type: 'monetary'    },
  { id: 'g2', title: 'New Customers',             target: 200,    unit: 'customers', type: 'count'        },
  { id: 'g3', title: 'Customer Satisfaction',     target: 90,     unit: '%',        type: 'qualitative' },
  { id: 'g4', title: 'Team Training Completed',   target: 5,      unit: 'sessions', type: 'qualitative' },
  { id: 'g5', title: 'Survey Follow-Up Calls',    target: 50,     unit: 'calls',    type: 'qualitative' }
];

// -- Performance entries (for Goals & KPI page, Profile, etc.) --
export const performanceData = [
  // Alice (u123)
  { userId: 'u123', goalId: 'g1', value: 425000, date: '2025-06-15' },
  { userId: 'u123', goalId: 'g2', value: 160,    date: '2025-06-10' },
  { userId: 'u123', goalId: 'g3', value: 85,     date: '2025-06-12' },
  { userId: 'u123', goalId: 'g4', value: 2,      date: '2025-06-05' },
  { userId: 'u123', goalId: 'g5', value: 20,     date: '2025-06-08' },

  // Bob (u124)
  { userId: 'u124', name: 'Bob Specialist', team: 'Sales', goalId: 'g1', value: 300000, date: '2025-06-14' },
  { userId: 'u124', name: 'Bob Specialist', team: 'Sales', goalId: 'g2', value: 120,    date: '2025-06-11' },
  { userId: 'u124', name: 'Bob Specialist', team: 'Sales', goalId: 'g4', value: 5,      date: '2025-06-09' },

  // Carol (u125)
  { userId: 'u125', name: 'Carol Analyst',  team: 'IT', goalId: 'g1', value: 450000, date: '2025-06-13' },
  { userId: 'u125', name: 'Carol Analyst',  team: 'IT', goalId: 'g2', value: 190,    date: '2025-06-12' },
  { userId: 'u125', name: 'Carol Analyst',  team: 'IT', goalId: 'g4', value: 5,      date: '2025-06-07' },

  // David (u126)
  { userId: 'u126', name: 'David Developer', team: 'IT', goalId: 'g5', value: 60,     date: '2025-06-06' }
];

// -- Feedback notes (for Profile pages) --
export const feedbackNotes = [
  {
    userId: 'u123',
    date:   '2025-05-20',
    note:   'Great leadership in Q2 planning.',
    author: 'CEO'
  },
  {
    userId: 'u124',
    date:   '2025-06-01',
    note:   'Excellent negotiation on new account.',
    author: 'Alice Manager'
  },
  {
    userId: 'u125',
    date:   '2025-06-03',
    note:   'Provided key insights for the dashboard design.',
    author: 'Alice Manager'
  }
];

// -- Training records (for Profile pages) --
export const trainingRecords = [
  {
    userId: 'u123',
    course: 'Leadership 101',
    date:   '2025-04-15',
    status: 'Completed'
  },
  {
    userId: 'u124',
    course: 'Advanced Negotiation',
    date:   '2025-05-10',
    status: 'Completed'
  },
  {
    userId: 'u125',
    course: 'SQL Best Practices',
    date:   '2025-05-22',
    status: 'In Progress'
  },
  {
    userId: 'u126',
    course: 'React Hooks Deep Dive',
    date:   '2025-06-01',
    status: 'Completed'
  }
];
