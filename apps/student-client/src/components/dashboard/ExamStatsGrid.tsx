import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

function StatCard({ title, value, label, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}
            >
              <span className="text-white text-sm font-semibold">{value}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">{label}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExamStatsGridProps {
  totalExams: number;
  availableNow: number;
  upcoming: number;
  downloaded: number;
}

export function ExamStatsGrid({
  totalExams,
  availableNow,
  upcoming,
  downloaded,
}: ExamStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatCard
        title="Total Exams"
        value={totalExams}
        label={`${totalExams} ${totalExams === 1 ? 'exam' : 'exams'}`}
        color="blue"
      />
      <StatCard
        title="Available Now"
        value={availableNow}
        label={`${availableNow} exams`}
        color="green"
      />
      <StatCard
        title="Upcoming"
        value={upcoming}
        label={`${upcoming} exams`}
        color="yellow"
      />
      <StatCard
        title="Downloaded"
        value={downloaded}
        label={`${downloaded} exams`}
        color="purple"
      />
    </div>
  );
}
