export type Choice = 'A' | 'B' | 'X' | null;

export interface Part1Answer {
  questionId: number;
  choice: Choice;
}

export interface Part2Answer {
  questionId: number;
  sub1Choice: Choice;
  sub2Choice: Choice;
  sub3Choice: Choice;
}

export interface StudentInfo {
  firstName: string;
  lastName: string;
  classLevel: string;
  room: string;
  studentNumber: string;
}

export interface AssessmentResult {
  id: string;
  timestamp: number;
  student: StudentInfo;
  part1Score: {
    R: number;
    I: number;
    S: number;
    C: number;
    E: number;
    A: number;
  };
  part2Score: {
    D: number;
    P: number;
    T: number;
  };
  part3ConsistencyPercentage: number;
}

declare global {
  interface Window {
    google?: any;
    tokenClient?: any;
  }
}
