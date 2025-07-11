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
import { GetAllExamsRes } from '../../services/get-all-exams';
import { AuthServerService } from '../../lib/auth-server';

export default async function DashboardPage() {
  // Get authenticated session
  const session = await AuthServerService.requireRole('TEACHER');

  // Make authenticated API call
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exams/teacher`, {
    headers: {
      Authorization: `Bearer ${session.tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!data.ok) {
    throw new Error('Failed to fetch exams');
  }

  const examsData: GetAllExamsRes = await data.json();

  function getExamStatus(exam: GetAllExamsRes[number]) {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    const now = new Date();

    if (exam.status === 'DRAFT') {
      return 'draft';
    }

    if (now < startTime) {
      return 'scheduled';
    }

    if (now >= startTime && now <= endTime) {
      return 'active';
    }

    return 'completed';
  }

  function getExamDuration(exam: GetAllExamsRes[number]) {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);

    return Math.round((endTime.getTime() - startTime.getTime()) / 60000); // duration in minutes
  }

  const examCardsData = examsData.map((exam) => ({
    id: exam.id,
    examCode: exam.examCode,
    title: exam.title,
    description: exam.description || 'No description provided',
    status: getExamStatus(exam) as
      | 'draft'
      | 'scheduled'
      | 'active'
      | 'completed',
    startTime: exam.startDate,
    duration: getExamDuration(exam),
    enrolledStudents: 25,
    completedStudents: 0,
    questionsCount: exam.questionsCount,
    averageScore: 0,
  }));

  const upcomingExams = examCardsData.filter(
    (exam) => exam.status === 'scheduled'
  );

  const activeExams = examCardsData.filter((exam) => exam.status === 'active');

  const totalStudents = examCardsData.reduce(
    (acc, exam) => acc + exam.enrolledStudents,
    0
  );

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
            <span className="text-2xl font-bold text-green-600">
              {totalStudents}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Across all your active exams</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Active Exams
            </h3>
            <span className="text-2xl font-bold text-blue-600">
              {activeExams.length}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Currently running exams</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Upcoming Exams
            </h3>
            <span className="text-2xl font-bold text-purple-600">
              {upcomingExams.length}
            </span>
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
          {examCardsData.map((exam) => (
            <ExamCard key={exam.id} {...exam} />
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
