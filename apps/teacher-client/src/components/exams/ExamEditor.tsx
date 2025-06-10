'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@one-exam-monorepo/ui';
import ExamForm from './ExamForm';
import QuestionCreator, { Question } from './QuestionCreator';
import { useExamStore } from '../../stores/examStore';
import { useCreateExam } from '../../hooks/useApi';
import { GetExamByIdRes } from '../../services/get-exam-by-id';
import ExamEditorQuestions from './ExamEditorQuestions';
import { ArrowLeft } from 'lucide-react';

interface ExamEditorProps {
  examId?: string;
  initialData: GetExamByIdRes;
  isEditMode?: boolean;
}

function transformApiDataToStoreFormat(apiData: GetExamByIdRes) {
  const examSettings = {
    title: apiData.title,
    description: apiData.description || '',
    startTime: new Date(apiData.startDate).toISOString().slice(0, 16), // Format for datetime-local input
    duration: Math.round(
      (new Date(apiData.endDate).getTime() -
        new Date(apiData.startDate).getTime()) /
        (1000 * 60)
    ), // Convert to minutes
    invitationCode: apiData.invitationCode,
  };

  const questions: Question[] = apiData.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type, // Keep the API type as-is since it matches Question type
    options: q.options?.map((opt) => ({
      value: opt.value, // Use 'value' property to match QuestionOption type
      isCorrect: opt.isCorrect,
    })),
    attachments: q.attachments || [],
  }));

  return { examSettings, questions };
}

export default function ExamEditor({
  examId,
  initialData,
  isEditMode = false,
}: ExamEditorProps) {
  const router = useRouter();
  const createExamMutation = useCreateExam();

  const {
    examSettings,
    setExamSettings,
    questions,
    addQuestion,
    updateQuestion,
    editingQuestion,
    setEditingQuestion,
    showQuestionForm,
    setShowQuestionForm,
    hasUnsavedChanges,
    markAsSaved,
    getChangedData,
    initializeExam,
  } = useExamStore();

  // Initialize the store when component mounts
  useEffect(() => {
    if (initialData) {
      const { examSettings, questions } =
        transformApiDataToStoreFormat(initialData);
      initializeExam(examSettings, questions);
    } else {
      // If no initial data, initialize with default values
      initializeExam();
    }
  }, [initialData, initializeExam]);

  const handleAddQuestion = (question: Question) => {
    addQuestion(question);
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    updateQuestion(updatedQuestion);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
  };

  const handleSaveExam = async () => {
    try {
      // Get only the changed data for efficient API calls
      const changes = getChangedData();

      console.log('Saving exam changes:', changes);
      console.log('Full exam data:', { examSettings, questions });

      if (isEditMode) {
        // Edit mode - update existing exam

        if (!examId) {
          console.error('Exam ID is required for updating an exam.');
          alert('Exam ID is required for updating an exam.');
          return;
        }

        // In a real implementation, you would send only the changes to the API
        // Example API call structure:
        // if (changes.examSettings) {
        //   await updateExamSettings(examId, changes.examSettings);
        // }
        // if (changes.questions) {
        //   if (changes.questions.added.length > 0) {
        //     await addQuestions(examId, changes.questions.added);
        //   }
        //   if (changes.questions.updated.length > 0) {
        //     await updateQuestions(examId, changes.questions.updated);
        //   }
        //   if (changes.questions.removed.length > 0) {
        //     await removeQuestions(examId, changes.questions.removed);
        //   }
        // }

        // Mark as saved in the store
        markAsSaved();
        alert('Exam updated successfully!');
      } else {
        // Create mode - create new exam
        if (changes.questions && changes.examSettings) {
          console.log('Creating exam with questions:', changes.questions);
          // const result = await createExamMutation.mutateAsync({
          //   examSettings: changes.examSettings,
          //   questions: changes.questions.added,
          // });

          // Mark as saved in the store
          markAsSaved();

          alert('Exam created successfully!');
          // Navigate to the edit page for the newly created exam
          // if (result?.id) {
          //   router.push(`/dashboard/edit-exam/${result.id}`);
          // } else {
          //   router.push('/dashboard');
          // }
        }
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? 'updating' : 'creating'} exam:`,
        error
      );
      alert(
        `Error ${isEditMode ? 'updating' : 'creating'} exam. Please try again.`
      );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Exam' : 'Create New Exam'}
          </h1>
          {hasUnsavedChanges && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        <Button asChild variant="outline" className="flex items-center gap-2">
          <Link href="/dashboard">
            <ArrowLeft />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Exam Settings</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <ExamForm examSettings={examSettings} onChange={setExamSettings} />
        </TabsContent>

        <TabsContent value="questions">
          {showQuestionForm && (
            <QuestionCreator
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onCancel={handleCancelEdit}
              questionToEdit={editingQuestion}
              isEditMode={!!editingQuestion}
            />
          )}

          {questions.length === 0 && !showQuestionForm && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">
                No Questions Created
              </h2>
              <p className="text-gray-500">
                You have not created any questions yet. Please add questions to
                your exam.
              </p>
            </div>
          )}

          {!showQuestionForm && (
            <div className="mt-6">
              <Button
                onClick={() => setShowQuestionForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create New Question
              </Button>
            </div>
          )}

          <ExamEditorQuestions />
        </TabsContent>
      </Tabs>

      <div className="mt-12 flex justify-end space-x-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSaveExam}>
          {isEditMode ? 'Update Exam' : 'Create Exam'}
        </Button>
      </div>
    </div>
  );
}
