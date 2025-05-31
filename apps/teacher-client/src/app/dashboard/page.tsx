import Link from 'next/link';
import { Button } from "@one-exam-monorepo/ui";

export default function DashboardPage() {
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
            <h3 className="text-lg font-semibold text-gray-700">Total Students</h3>
            <span className="text-2xl font-bold text-green-600">128</span>
          </div>
          <p className="mt-2 text-gray-600">Across all your active classes</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Upcoming Exams</h3>
            <span className="text-2xl font-bold text-purple-600">3</span>
          </div>
          <p className="mt-2 text-gray-600">You have 3 exams scheduled</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Exams</h2>
        </div>
        <div className="p-6">          <div className="divide-y">
            {[
              {
                name: 'Introduction to Computer Science',
                id: 'CS101',
                students: 32,
                nextExam: 'June 15, 2025',
              },
              {
                name: 'Data Structures and Algorithms',
                id: 'CS202',
                students: 28,
                nextExam: 'June 10, 2025',
              },
              {
                name: 'Database Systems',
                id: 'CS303',
                students: 24,
                nextExam: 'June 22, 2025',
              },
            ].map((classItem, index) => (
              <div key={index} className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{classItem.name}</h3>
                  <p className="text-sm text-gray-600">Class ID: {classItem.id} • {classItem.students} students</p>
                </div>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Next exam: {classItem.nextExam}
                  </span>
                  <button className="text-gray-600 hover:text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
        </div>
        <div className="p-6">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">You created a new exam for CS101</p>
                <p className="text-sm text-gray-500">30 minutes ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">CS202 exam grading completed</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Scheduled a new exam for CS303</p>
                <p className="text-sm text-gray-500">Yesterday at 3:45 PM</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
