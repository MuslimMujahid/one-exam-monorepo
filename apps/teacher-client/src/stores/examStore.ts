import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Question } from '../components/exams/QuestionCreator';
import { v4 as uuidv4 } from 'uuid';

export interface ExamSettings {
  title: string;
  description: string;
  startTime: string;
  duration: number; // in minutes
  examCode: string; // Unique code for the exam
  passKey: string;
}

export interface ExamState {
  // Current exam data
  examSettings: ExamSettings;
  questions: Question[];
  editingQuestion: Question | null;
  showQuestionForm: boolean;
  activeTab: string;

  // UI state
  showScrollFab: boolean;

  // Change tracking
  originalExamSettings: ExamSettings | null;
  originalQuestions: Question[];
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;

  // Actions
  setExamSettings: (settings: Partial<ExamSettings>) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (question: Question) => void;
  removeQuestion: (questionId: string) => void;
  setEditingQuestion: (question: Question | null) => void;
  setShowQuestionForm: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  setShowScrollFab: (show: boolean) => void;

  // Change tracking actions
  markAsSaved: () => void;
  getChangedData: () => {
    examSettings?: Partial<ExamSettings>;
    questions?: {
      added: Question[];
      updated: Question[];
      removed: string[];
    };
  };
  resetToSaved: () => void;
  initializeExam: (examSettings?: ExamSettings, questions?: Question[]) => void;

  // Utility actions
  generateRandomCode: () => string;
  resetForm: () => void;
}

const generateRandomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const defaultExamSettings: ExamSettings = {
  title: '',
  description: '',
  startTime: '',
  duration: 60,
  examCode: '',
  passKey: generateRandomCode(),
};

// Deep comparison utility
const deepEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// Find differences in arrays of objects by ID
const findArrayChanges = (original: Question[], current: Question[]) => {
  const originalMap = new Map(original.map((q) => [q.id, q]));
  const currentMap = new Map(current.map((q) => [q.id, q]));

  const added: Question[] = [];
  const updated: Question[] = [];
  const removed: string[] = [];

  // Find added and updated
  current.forEach((question) => {
    const originalQuestion = originalMap.get(question.id);
    if (!originalQuestion) {
      added.push(question);
    } else if (!deepEqual(originalQuestion, question)) {
      updated.push(question);
    }
  });

  // Find removed
  original.forEach((question) => {
    if (!currentMap.has(question.id)) {
      removed.push(question.id);
    }
  });

  return { added, updated, removed };
};

export const useExamStore = create<ExamState>()(
  devtools(
    (set, get) => ({
      // Initial state
      examSettings: defaultExamSettings,
      questions: [],
      editingQuestion: null,
      showQuestionForm: false,
      activeTab: 'settings',
      showScrollFab: false,

      // Change tracking
      originalExamSettings: null,
      originalQuestions: [],
      hasUnsavedChanges: false,
      lastSavedAt: null,

      // Actions
      setExamSettings: (settings) =>
        set((state) => {
          const newExamSettings = { ...state.examSettings, ...settings };
          const hasChanges = state.originalExamSettings
            ? !deepEqual(state.originalExamSettings, newExamSettings)
            : true;

          return {
            examSettings: newExamSettings,
            hasUnsavedChanges: hasChanges || state.hasUnsavedChanges,
          };
        }),

      addQuestion: (question) =>
        set((state) => {
          const newQuestions = [
            ...state.questions,
            { ...question, id: uuidv4() },
          ];
          return {
            questions: newQuestions,
            hasUnsavedChanges: true,
            showQuestionForm: false,
          };
        }),

      updateQuestion: (updatedQuestion) =>
        set((state) => {
          const newQuestions = state.questions.map((q) =>
            q.id === updatedQuestion.id ? updatedQuestion : q
          );
          return {
            questions: newQuestions,
            editingQuestion: null,
            showQuestionForm: false,
            hasUnsavedChanges: true,
          };
        }),

      removeQuestion: (questionId) =>
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== questionId),
          hasUnsavedChanges: true,
        })),

      setEditingQuestion: (question) =>
        set(() => ({
          editingQuestion: question,
          showQuestionForm: !!question,
        })),

      setShowQuestionForm: (show) =>
        set(() => ({
          showQuestionForm: show,
          editingQuestion: show ? get().editingQuestion : null,
        })),

      setActiveTab: (tab) =>
        set(() => ({
          activeTab: tab,
        })),

      setShowScrollFab: (show) =>
        set(() => ({
          showScrollFab: show,
        })),

      // Change tracking actions
      markAsSaved: () =>
        set((state) => ({
          originalExamSettings: { ...state.examSettings },
          originalQuestions: [...state.questions],
          hasUnsavedChanges: false,
          lastSavedAt: new Date(),
        })),

      getChangedData: () => {
        const state = get();
        const changes: {
          examSettings?: Partial<ExamSettings>;
          questions?: {
            added: Question[];
            updated: Question[];
            removed: string[];
          };
        } = {};

        // Check exam settings changes
        if (
          state.originalExamSettings &&
          !deepEqual(state.originalExamSettings, state.examSettings)
        ) {
          const examChanges: Partial<ExamSettings> = {};
          Object.keys(state.examSettings).forEach((key) => {
            const typedKey = key as keyof ExamSettings;
            if (
              state.originalExamSettings![typedKey] !==
              state.examSettings[typedKey]
            ) {
              (examChanges as any)[typedKey] = state.examSettings[typedKey];
            }
          });
          if (Object.keys(examChanges).length > 0) {
            changes.examSettings = examChanges;
          }
        }

        // Check questions changes
        const questionChanges = findArrayChanges(
          state.originalQuestions,
          state.questions
        );
        if (
          questionChanges.added.length > 0 ||
          questionChanges.updated.length > 0 ||
          questionChanges.removed.length > 0
        ) {
          changes.questions = questionChanges;
        }

        return changes;
      },

      resetToSaved: () =>
        set((state) => ({
          examSettings: state.originalExamSettings || defaultExamSettings,
          questions: [...state.originalQuestions],
          hasUnsavedChanges: false,
          editingQuestion: null,
          showQuestionForm: false,
        })),

      initializeExam: (examSettings, questions) =>
        set(() => {
          const initialExamSettings = examSettings || defaultExamSettings;
          const initialQuestions = questions || [];

          return {
            examSettings: initialExamSettings,
            questions: initialQuestions,
            originalExamSettings: { ...initialExamSettings },
            originalQuestions: [...initialQuestions],
            hasUnsavedChanges: false,
            lastSavedAt: examSettings ? new Date() : null,
            editingQuestion: null,
            showQuestionForm: initialQuestions.length === 0,
          };
        }),

      generateRandomCode,

      resetForm: () =>
        set(() => ({
          examSettings: {
            ...defaultExamSettings,
            passKey: generateRandomCode(),
          },
          questions: [],
          originalExamSettings: null,
          originalQuestions: [],
          hasUnsavedChanges: false,
          lastSavedAt: null,
          editingQuestion: null,
          showQuestionForm: true,
          activeTab: 'settings',
          showScrollFab: false,
        })),
    }),
    {
      name: 'exam-store',
    }
  )
);
