'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@one-exam-monorepo/ui';
import ExamForm from '../../../components/exams/ExamForm';
import QuestionCreator, {
  Question,
} from '../../../components/exams/QuestionCreator';
import { useExamStore } from '../../../stores/examStore';

export default function CreateExamPage() {  const {
    activeTab,
    setActiveTab,
    examSettings,
    setExamSettings,
    questions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    editingQuestion,
    setEditingQuestion,
    showQuestionForm,
    setShowQuestionForm,
    showScrollFab,
    setShowScrollFab,
    hasUnsavedChanges,
    markAsSaved,
    getChangedData,
    initializeExam,
  } = useExamStore();
  // Initialize the store when component mounts
  useEffect(() => {
    initializeExam();
  }, [initializeExam]);

  // Effect to detect scroll position and show/hide the FAB
  useEffect(() => {
    if (activeTab !== 'questions' || showQuestionForm) return;

    const handleScroll = () => {
      // Show FAB when user has scrolled down at least 300px
      setShowScrollFab(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial scroll position

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, showQuestionForm, setShowScrollFab]);

  useEffect(() => {
    if (questions.length === 0) {
      setShowQuestionForm(true);
    }
  }, [questions, setShowQuestionForm]);

  const handleAddQuestion = (question: Question) => {
    addQuestion(question);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    // Automatically scroll to the top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    updateQuestion(updatedQuestion);
  };

  const handleRemoveQuestion = (questionId: string) => {
    removeQuestion(questionId);
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

      alert('Exam created successfully!');
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Error saving exam. Please try again.');
    }
  };
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Create New Exam</h1>
          {hasUnsavedChanges && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Exam Settings
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Questions ({questions.length})
          </button>
        </nav>
      </div>      {activeTab === 'settings' ? (
        <ExamForm
          examSettings={examSettings}
          onChange={setExamSettings}
        />
      ) : (
        <div>
          {showQuestionForm ? (
            <QuestionCreator
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onCancel={handleCancelEdit}
              questionToEdit={editingQuestion}
              isEditMode={!!editingQuestion}
            />
          ) : (
            <div className="mb-6">
              <Button
                onClick={() => setShowQuestionForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create New Question
              </Button>
            </div>
          )}

          {questions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Created Questions</h2>
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    {' '}
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">Question {index + 1}</h3>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(question.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2">{question.text}</p>{' '}
                    {question.attachments &&
                      question.attachments.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Attachments ({question.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {question.attachments.map((attachment, idx) => (
                              <div
                                key={idx}
                                className="relative"
                                style={{ height: '160px' }}
                              >
                                <Image
                                  src={attachment}
                                  alt={`Question attachment ${idx + 1}`}
                                  layout="fill"
                                  objectFit="contain"
                                  className="border rounded"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    {question.type === 'text' && (
                      <div className="mt-2 text-sm text-gray-500">
                        Text answer question
                      </div>
                    )}
                    {question.type === 'single' && (
                      <div className="mt-2 space-y-1">
                        {question.options?.map((option, i) => (
                          <div key={i} className="flex items-center">
                            <input
                              type="radio"
                              checked={option.isCorrect}
                              readOnly
                              className="mr-2"
                            />
                            <span>{option.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.type === 'multiple' && (
                      <div className="mt-2 space-y-1">
                        {question.options?.map((option, i) => (
                          <div key={i} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              readOnly
                              className="mr-2"
                            />
                            <span>{option.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 flex justify-end space-x-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSaveExam}>Create Exam</Button>
      </div>      {/* Floating Action Button for creating new questions */}
      {activeTab === 'questions' &&
        !showQuestionForm &&
        questions.length > 0 &&
        showScrollFab && (
          <button
            onClick={() => {
              setShowQuestionForm(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-8 right-8 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            aria-label="Create new question"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="font-medium">Add Question</span>
          </button>
        )}
    </div>
  );
}
