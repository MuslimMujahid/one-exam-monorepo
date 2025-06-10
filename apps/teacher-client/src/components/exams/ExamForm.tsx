'use client';

import { Input, Textarea } from '@one-exam-monorepo/ui';

interface ExamFormProps {
  examSettings: {
    title: string;
    description: string;
    startTime: string;
    duration: number;
    invitationCode: string;
  };
  onChange: (settings: Partial<ExamFormProps['examSettings']>) => void;
}

export default function ExamForm({ examSettings, onChange }: ExamFormProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      onChange({ duration: value });
    }
  };

  const regenerateCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    onChange({ invitationCode: newCode });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Exam Details</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exam Title
            </label>
            <Input
              id="title"
              name="title"
              value={examSettings.title}
              onChange={handleChange}
              placeholder="Enter exam title"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description (optional)
            </label>
            <Textarea
              id="description"
              name="description"
              value={examSettings.description}
              onChange={handleChange}
              placeholder="Enter exam description"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Exam Settings</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Time
            </label>
            <Input
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={examSettings.startTime}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Duration (minutes)
            </label>
            <Input
              id="duration"
              name="duration"
              type="number"
              value={examSettings.duration}
              onChange={handleDurationChange}
              min="5"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="examCode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exam Code
            </label>
            <div className="flex gap-2">
              <Input
                id="examCode"
                name="examCode"
                value={examSettings.invitationCode}
                onChange={handleChange}
                className="flex-1"
                readOnly
              />
              <button
                type="button"
                onClick={regenerateCode}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm"
              >
                Regenerate
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Students will use this code to join the exam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
