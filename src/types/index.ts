export interface Exercise {
  id: string;
  name: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  sets: number;
  reps: number;
  restDuration: number; // in seconds
  completedSets: (number | null)[]; // null means not done, 0-5 means reps completed
}

export interface WorkoutPreset {
  name: string;
  exercises: Omit<Exercise, 'completedSets'>[];
}
