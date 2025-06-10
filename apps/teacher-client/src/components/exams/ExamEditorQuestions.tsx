import Image from 'next/image';
import { Button } from '@one-exam-monorepo/ui';
import { useExamStore } from '../../stores/examStore';
import { Question } from './QuestionCreator';

export default function ExamEditorQuestions() {
  const { questions, setEditingQuestion, removeQuestion } = useExamStore();

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    // Automatically scroll to the top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveQuestion = (questionId: string) => {
    removeQuestion(questionId);
  };

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Created Questions</h2>
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="border rounded-lg p-4 bg-white shadow-sm"
          >
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
            <p className="mt-2">{question.text}</p>

            {question.attachments && question.attachments.length > 0 && (
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

            {question.type === 'multiple-choice-single' && (
              <div className="mt-2 space-y-1">
                {question.options?.map((option, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="radio"
                      checked={option.isCorrect}
                      readOnly
                      className="mr-2"
                    />
                    <span>{option.value}</span>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'multiple-choice-multiple' && (
              <div className="mt-2 space-y-1">
                {question.options?.map((option, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      readOnly
                      className="mr-2"
                    />
                    <span>{option.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
