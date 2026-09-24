/**
 * Registry of all Student Dashboard Sections.
 * Adding a section here automatically integrates it with Admin Section Access Control,
 * lock indicators, security guards, and maintenance popups.
 */

export const DEFAULT_MAINTENANCE_MESSAGE = "We're currently working on this section to improve your experience. Please check back later.";

export const DASHBOARD_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Main student dashboard overview, daily study stats, and milestones',
    category: 'Core',
    iconName: 'LayoutDashboard'
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Official academic announcements, exam alerts, and broadcast notices',
    category: 'Information',
    iconName: 'Megaphone'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Academic schedules, planned events, and daily study activity calendar',
    category: 'Planning',
    iconName: 'Calendar'
  },
  {
    id: 'syllabus',
    label: 'Syllabus & Progress',
    description: 'Curriculum tracker, subject chapter checklists, and completion percentages',
    category: 'Academic',
    iconName: 'BookOpenCheck'
  },
  {
    id: 'revision',
    label: 'Revision',
    description: 'Structured revision tracker, subject-wise revision chapters and progress',
    category: 'Academic',
    iconName: 'RotateCcw'
  },
  {
    id: 'leaderboard',
    label: 'Live Leaderboard',
    description: 'Peer study rankings, point leaderboards, and competitive standings',
    category: 'Gamification',
    iconName: 'Trophy'
  },
  {
    id: 'overall_leaderboard',
    label: 'Overall Leaderboard',
    description: 'Universal student ranking across all streams by total study hours, points, and streaks',
    category: 'Gamification',
    iconName: 'Medal'
  },
  {
    id: 'timer',
    label: 'Study Timer',
    description: 'Precision stopwatch for subject-wise study sessions and verified points',
    category: 'Core',
    iconName: 'Clock'
  },
  {
    id: 'mentor',
    label: 'Mentor Session',
    description: 'Live mentorship sessions, meeting links, and recorded guidance videos',
    category: 'Mentorship',
    iconName: 'Video'
  },
  {
    id: 'webcam_study',
    label: 'Webcam Study',
    description: 'Live webcam study hall with Google Meet and timer accountability',
    category: 'Core',
    iconName: 'Video'
  },
  {
    id: 'writing',
    label: 'Writing Practice',
    description: 'Daily answer writing prompts, questions, and practice submissions',
    category: 'Practice',
    iconName: 'PenLine'
  },
  {
    id: 'missions',
    label: 'Weekly Mission',
    description: 'Curated weekly study missions, milestones, and bonus rewards',
    category: 'Gamification',
    iconName: 'Flag'
  },
  {
    id: 'targets',
    label: 'Self-Managed Hub',
    description: 'Daily subject targets, timer completion verification, and test tracker',
    category: 'Planning',
    iconName: 'Target'
  },
  {
    id: 'notes',
    label: 'Notes & Resources',
    description: 'Subject-wise revision notes, chapter formulas, and study PDF library',
    category: 'Academic',
    iconName: 'FileText'
  },
  {
    id: 'doubts',
    label: 'Academic Doubts',
    description: 'Student academic doubt forum, peer inquiries, and mentor answers',
    category: 'Support',
    iconName: 'HelpCircle'
  },
  {
    id: 'profile',
    label: 'My Profile',
    description: 'Student account credentials, stream, level, roll number, and settings',
    category: 'Account',
    iconName: 'User'
  }
];

export function getSectionById(id) {
  if (!id) return null;
  return DASHBOARD_SECTIONS.find(s => s.id === id) || {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' '),
    description: 'Dashboard Section',
    category: 'General',
    iconName: 'Layers'
  };
}
