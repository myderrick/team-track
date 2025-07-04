// src/data/index.js

// -- Users (for Directory & Profiles) --
export const users = [
  {
    id: 'u123',
    name: 'Alice Support Lead',
    role: 'support_lead',
    team: 'Application Support',
    skills: ['Incident Management', 'Client Communication']
  },
  {
    id: 'u124',
    name: 'Bob Implementation Specialist',
    role: 'implementation_specialist',
    team: 'Implementation',
    skills: ['System Integration', 'Client Onboarding']
  },
  {
    id: 'u125',
    name: 'Carol Business Analyst',
    role: 'business_analyst',
    team: 'Business Analysis',
    skills: ['Requirements Gathering', 'Process Mapping']
  },
  {
    id: 'u126',
    name: 'David Technical Support',
    role: 'technical_support',
    team: 'T24 Application Support',
    skills: ['SQL', 'Troubleshooting']
  },
  {
    id: 'u127',
    name: 'Eve QA Tester',
    role: 'qa_tester',
    team: 'Quality Assurance',
    skills: ['Test Automation', 'Regression Testing']
  },
  {
    id: 'u128',
    name: 'Frank Implementation Manager',
    role: 'implementation_manager',
    team: 'Implementation',
    skills: ['Project Management', 'Stakeholder Management']
  },
  {
    id: 'u129',
    name: 'Grace Release Coordinator',
    role: 'release_coordinator',
    team: 'Release Management',
    skills: ['Release Planning', 'Change Management']
  },
  {
    id: 'u130',
    name: 'Hank DevOps Engineer',
    role: 'devops_engineer',
    team: 'DevOps',
    skills: ['CI/CD', 'Cloud Infrastructure']
  },
  // project manager
  {
    id: 'u131',
    name: 'Ivy Project Manager',
    role: 'project_manager',
    team: 'Project Management',
    skills: ['Agile Methodologies', 'Risk Management']
  }
];

// -- Goals (for all pages) --
export const allGoals = [
  { id: 'g1', title: 'Monthly Sales Target',      target: 500000, unit: '$',        type: 'monetary'    },
  { id: 'g2', title: 'New Customers',             target: 200,    unit: 'customers', type: 'count'        },
  { id: 'g3', title: 'Customer Satisfaction',     target: 90,     unit: '%',        type: 'qualitative' },
  { id: 'g4', title: 'Team Training Completed',   target: 5,      unit: 'sessions', type: 'qualitative' },
  { id: 'g5', title: 'Survey Follow-Up Calls',    target: 50,     unit: 'calls',    type: 'qualitative' },
  //project manager
  { id: 'g6', title: 'Project Milestones Met',    target: 3,      unit: 'milestones', type: 'qualitative' },
  { id: 'g7', title: 'Code Review Efficiency',    target: 80,     unit: '%',        type: 'qualitative' },
  { id: 'g8', title: 'Incident Resolution Time',  target: 24,     unit: 'hours',    type: 'qualitative' },
  { id: 'g9', title: 'Release Cycle Time',        target: 14,     unit: 'days',     type: 'qualitative' },
  { id: 'g10', title: 'System Uptime',            target: 99.9,   unit: '%',        type: 'qualitative' }

];

// -- Performance entries (for Goals & KPI page, Profile, etc.) --
export const performanceData = [
  // Alice Support Lead (u123)
  { userId: 'u123', goalId: 'g1', value: 425000, date: '2025-06-15' },
  { userId: 'u123', goalId: 'g2', value: 160,    date: '2025-06-10' },
  { userId: 'u123', goalId: 'g3', value: 85,     date: '2025-06-12' },
  { userId: 'u123', goalId: 'g4', value: 2,      date: '2025-06-05' },
  { userId: 'u123', goalId: 'g5', value: 20,     date: '2025-06-08' },

  // Bob Implementation Specialist (u124)
  { userId: 'u124', goalId: 'g1', value: 300000, date: '2025-06-14' },
  { userId: 'u124', goalId: 'g2', value: 120,    date: '2025-06-11' },
  { userId: 'u124', goalId: 'g4', value: 5,      date: '2025-06-09' },

  // Carol Business Analyst (u125)
  { userId: 'u125', goalId: 'g1', value: 450000, date: '2025-06-13' },
  { userId: 'u125', goalId: 'g2', value: 190,    date: '2025-06-12' },
  { userId: 'u125', goalId: 'g4', value: 5,      date: '2025-06-07' },

  // David Technical Support (u126)
  { userId: 'u126', goalId: 'g5', value: 60,     date: '2025-06-06' },

  // Eve QA Tester (u127)
  { userId: 'u127', goalId: 'g3', value: 92,     date: '2025-06-10' },
  { userId: 'u127', goalId: 'g4', value: 3,      date: '2025-06-08' },

  // Frank Implementation Manager (u128)
  { userId: 'u128', goalId: 'g1', value: 480000, date: '2025-06-15' },
  { userId: 'u128', goalId: 'g2', value: 180,    date: '2025-06-13' },

  // Grace Release Coordinator (u129)
  { userId: 'u129', goalId: 'g5', value: 55,     date: '2025-06-12' },

  // Hank DevOps Engineer (u130)
  { userId: 'u130', goalId: 'g4', value: 4,      date: '2025-06-11' },

  // Ivy Project Manager (u131)
  { userId: 'u131', goalId: 'g6', value: 2,      date: '2025-06-14' },
  { userId: 'u131', goalId: 'g7', value: 85,     date: '2025-06-13' },
  { userId: 'u131', goalId: 'g8', value: 20,     date: '2025-06-12' },
  { userId: 'u131', goalId: 'g9', value: 10,     date: '2025-06-11' },
  { userId: 'u131', goalId: 'g10', value: 99.8,  date: '2025-06-10' },
 
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
    note:   'Excellent client onboarding.',
    author: 'Alice Support Lead'
  },
  {
    userId: 'u125',
    date:   '2025-06-03',
    note:   'Provided key insights for requirements gathering.',
    author: 'Alice Support Lead'
  },
  {
    userId: 'u127',
    date:   '2025-06-05',
    note:   'Thorough regression testing on release v2.1.',
    author: 'Grace Release Coordinator'
  },
  {
    userId: 'u128',
    date:   '2025-06-07',
    note:   'Managed stakeholder expectations well.',
    author: 'CEO'
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
    course: 'System Integration Best Practices',
    date:   '2025-05-10',
    status: 'Completed'
  },
  {
    userId: 'u125',
    course: 'Process Mapping Advanced',
    date:   '2025-05-22',
    status: 'In Progress'
  },
  {
    userId: 'u126',
    course: 'SQL Troubleshooting',
    date:   '2025-06-01',
    status: 'Completed'
  },
  {
    userId: 'u127',
    course: 'Test Automation Frameworks',
    date:   '2025-06-03',
    status: 'Completed'
  },
  {
    userId: 'u128',
    course: 'Project Management Professional',
    date:   '2025-05-28',
    status: 'Completed'
  },
  {
    userId: 'u129',
    course: 'Release Planning Essentials',
    date:   '2025-06-02',
    status: 'Completed'
  },
  {
    userId: 'u130',
    course: 'CI/CD with Cloud',
    date:   '2025-06-04',
    status: 'Completed'
  }
];
