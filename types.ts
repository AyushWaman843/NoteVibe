
export type Branch = 'Computer Science' | 'Data Science' | 'IT' | 'Mechatronics';
export type Semester = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  subtitle?: string;
  content: string;
  attachments?: Attachment[];
  userId: string;
  createdByRole: 'admin' | 'student';
  branch: Branch;
  semester: Semester;
  createdAt: string;
  lastEdited: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'student';
  semester: Semester;
  branch: Branch;
}

export type ViewState = 'subjects' | 'notes' | 'editor';
