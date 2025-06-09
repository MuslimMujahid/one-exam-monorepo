"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Input } from "@one-exam-monorepo/ui";

export type QuestionOption = {
  text: string;
  isCorrect: boolean;
}

export type Question = {
  id: string;
  text: string;
  type: 'text' | 'multiple-choice-single' | 'multiple-choice-multiple';
  options?: QuestionOption[];
  attachments: string[];
}

interface QuestionCreatorProps {
  onAddQuestion: (question: Question) => void;
  onUpdateQuestion?: (question: Question) => void;
  onCancel?: () => void;
  questionToEdit?: Question | null;
  isEditMode?: boolean;
}

export default function QuestionCreator({
  onAddQuestion,
  onUpdateQuestion,
  onCancel,
  questionToEdit = null,
  isEditMode = false
}: QuestionCreatorProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<Question['type']>('text');
  const [options, setOptions] = useState<QuestionOption[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);  const [attachments, setAttachments] = useState<string[]>([]);

  // Initialize form with questionToEdit data when in edit mode
  useEffect(() => {
    if (questionToEdit) {
      setQuestionText(questionToEdit.text);
      setQuestionType(questionToEdit.type);
      setOptions(questionToEdit.options || [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      setAttachments(questionToEdit.attachments || []);
    }
  }, [questionToEdit]);

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleOptionCorrectChange = (index: number) => {
    const newOptions = [...options];

    // If single choice, uncheck all other options
    if (questionType === 'multiple-choice-single') {
      newOptions.forEach((option, i) => {
        option.isCorrect = i === index;
      });
    } else {
      // If multiple choice, toggle the current option
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }

    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { text: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // Maintain minimum 2 options
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    Array.from(files).forEach(file => {
      // Only allow images
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as Question['type'];
    setQuestionType(newType);

    // Reset options when switching to text type
    if (newType === 'text') {
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    }
    // If switching from multiple-choice-single to multiple-choice-multiple, reset all correct flags
    else if (newType === 'multiple-choice-multiple' && questionType === 'multiple-choice-single') {
      setOptions(options.map(opt => ({ ...opt, isCorrect: false })));
    }
    // If switching from multiple-choice-multiple to multiple-choice-single, ensure only one option is selected
    else if (newType === 'multiple-choice-single' && questionType === 'multiple-choice-multiple') {
      const hasSelected = options.some(opt => opt.isCorrect);
      setOptions(options.map((opt, idx) => ({
        ...opt,
        isCorrect: hasSelected ? idx === options.findIndex(o => o.isCorrect) : idx === 0
      })));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      alert('Please enter a question.');
      return;
    }

    // For options-based questions, validate options
    if (questionType !== 'text') {
      const validOptions = options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options.');
        return;
      }

      // For single-choice, ensure exactly one correct answer
      if (questionType === 'multiple-choice-single' && !options.some(opt => opt.isCorrect)) {
        alert('Please select the correct answer.');
        return;
      }

      // For multiple-choice, ensure at least one correct answer
      if (questionType === 'multiple-choice-multiple' && !options.some(opt => opt.isCorrect)) {
        alert('Please select at least one correct answer.');
        return;
      }
    }    // Prepare the question data with proper typing
    const questionData: Omit<Question, 'id'> = {
      text: questionText,
      type: questionType,
      attachments: attachments,
    };

    // Add options if not text type
    if (questionType !== 'text') {
      questionData.options = options.filter(opt => opt.text.trim());
    }

    if (isEditMode && questionToEdit) {
      // For updating, pass the existing ID
      const updatedQuestion: Question = {
        ...questionData,
        id: questionToEdit.id,
      };
      onUpdateQuestion?.(updatedQuestion);
    } else {
      // For new questions, we'll need a temporary ID
      // The parent component will handle generating the real ID
      onAddQuestion({
        ...questionData,
        id: 'temp-' + Date.now().toString() // This will be replaced by the parent
      });

      // Only reset form for new questions, not when editing
      if (!isEditMode) {
        setQuestionText('');
        setQuestionType('text');
        setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
        setAttachments([]);
      }
    }
  };

  const handleCancelClick = () => {
    onCancel?.();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">
        {isEditMode ? 'Edit Question' : 'Create New Question'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
            Question Text
          </label>
          <textarea
            id="questionText"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter your question here"
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        <div>
          <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-1">
            Question Type
          </label>
          <select
            id="questionType"
            value={questionType}
            onChange={handleTypeChange}
            className="w-full h-10 rounded border border-gray-300 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="text">Text Answer</option>
            <option value="single">Multiple Choice (Single Answer)</option>
            <option value="multiple">Multiple Choice (Multiple Answers)</option>
          </select>
        </div>

        {questionType !== 'text' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Options
            </label>

            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex items-center">
                  <input
                    type={questionType === 'multiple-choice-single' ? 'radio' : 'checkbox'}
                    checked={option.isCorrect}
                    onChange={() => handleOptionCorrectChange(index)}
                    name="correctOption"
                    className="mr-2"
                  />
                </div>

                <Input
                  value={option.text}
                  onChange={(e) => handleOptionTextChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                  required
                />

                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="text-red-500 hover:text-red-700 px-2 py-1"
                  disabled={options.length <= 2}
                >
                  ✕
                </button>
              </div>
            ))}

            <Button
              type="button"
              onClick={addOption}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Add Option
            </Button>
          </div>
        )}        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachments (Optional)
          </label>

          {/* Display existing attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {attachments.map((attachment, index) => (
                <div key={index} className="relative" style={{ height: '160px', width: '240px' }}>
                  <Image
                    src={attachment}
                    alt={`Question attachment ${index + 1}`}
                    layout="fill"
                    objectFit="contain"
                    className="border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center -mt-2 -mr-2 z-10"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area for new attachments - always visible */}
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload images</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleAttachmentChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              {attachments.length > 0 && (
                <p className="text-sm text-blue-600">{attachments.length} attachment(s) added</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={handleCancelClick}>
              Cancel
            </Button>
          )}
          <Button type="submit">
            {isEditMode ? 'Update Question' : 'Add Question'}
          </Button>
        </div>
      </form>
    </div>
  );
}
