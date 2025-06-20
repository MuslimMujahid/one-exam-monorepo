import Link from 'next/link';
import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@one-exam-monorepo/ui';
import { ExamCard } from '../../components/exams/ExamCard';
import { Plus, Check, Clock } from 'lucide-react';

export default function DashboardPage() {
  // Mock exam data - in a real app, this would come from an API
  const mockExams = [
    {
      id: '1',
      title: 'Introduction to Computer Science - Midterm',
      description:
        'Covers chapters 1-5: Variables, Functions, and Control Structures',
      examCode: 'CS101M',
      status: 'scheduled' as const,
      startTime: '2025-06-15T10:00:00Z',
      duration: 90,
      totalStudents: 32,
      enrolledStudents: 28,
      createdAt: '2025-06-01T10:00:00Z',
      questionCount: 25,
    },
    {
      id: '2',
      title: 'Data Structures Final Exam',
      description:
        'Comprehensive exam covering all data structures and algorithms',
      examCode: 'CS202F',
      status: 'active' as const,
      startTime: '2025-06-11T14:00:00Z',
      duration: 120,
      totalStudents: 28,
      enrolledStudents: 28,
      completedStudents: 12,
      createdAt: '2025-05-28T10:00:00Z',
      questionCount: 30,
    },
    {
      id: '3',
      title: 'Database Systems Quiz',
      description: 'Quick assessment on SQL and database design',
      examCode: 'CS303Q',
      status: 'completed' as const,
      startTime: '2025-06-08T09:00:00Z',
      duration: 45,
      totalStudents: 24,
      enrolledStudents: 24,
      completedStudents: 22,
      averageScore: 85.6,
      createdAt: '2025-06-05T10:00:00Z',
      questionCount: 15,
    },
    {
      id: '4',
      title: 'Advanced Algorithms Practice Test',
      description: 'Practice test for upcoming final exam',
      examCode: 'CS401P',
      status: 'draft' as const,
      startTime: '2025-06-20T11:00:00Z',
      duration: 60,
      totalStudents: 18,
      enrolledStudents: 0,
      createdAt: '2025-06-10T10:00:00Z',
      questionCount: 0,
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/create-exam">Create New Exam</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Total Students
            </h3>
            <span className="text-2xl font-bold text-green-600">102</span>
          </div>
          <p className="mt-2 text-gray-600">Across all your active exams</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Active Exams
            </h3>
            <span className="text-2xl font-bold text-blue-600">1</span>
          </div>
          <p className="mt-2 text-gray-600">Currently running exams</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Upcoming Exams
            </h3>
            <span className="text-2xl font-bold text-purple-600">2</span>
          </div>
          <p className="mt-2 text-gray-600">Scheduled for this week</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Your Exams</h2>
          <div className="flex space-x-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>{' '}
        <div className="divide-y">
          {mockExams.map((exam) => (
            <ExamCard
              key={exam.id}
              id={exam.id}
              title={exam.title}
              description={exam.description}
              status={exam.status}
              startTime={exam.startTime}
              duration={exam.duration}
              totalStudents={exam.totalStudents}
              enrolledStudents={exam.enrolledStudents}
              completedStudents={exam.completedStudents}
              averageScore={exam.averageScore}
              createdAt={exam.createdAt}
              questionCount={exam.questionCount}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          {' '}
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Plus className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">
                  You created a new exam for CS101
                </p>
                <p className="text-sm text-gray-500">30 minutes ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Check className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">
                  CS202 exam grading completed
                </p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">
                  Scheduled a new exam for CS303
                </p>
                <p className="text-sm text-gray-500">Yesterday at 3:45 PM</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
