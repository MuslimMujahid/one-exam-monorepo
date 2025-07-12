// Configuration for offline exam storage
export const OFFLINE_EXAM_CONFIG = {
  // Directory name for storing preloaded exams
  EXAMS_DIRECTORY: 'preloaded-exams',

  // File extension for exam data files
  EXAM_FILE_EXTENSION: '.json',

  // Maximum size for exam data files (in bytes) - 10MB
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  // Success message display duration (in milliseconds)
  SUCCESS_MESSAGE_DURATION: 3000,
} as const;
