import React from 'react';
import {
  Edit,
  Clock,
  Play,
  CheckCircle,
  Users,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@one-exam-monorepo/ui';

export interface ExamCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  duration: number;
  totalStudents: number;
  enrolledStudents: number;
  completedStudents?: number;
  averageScore?: number;
  createdAt: string;
  questionCount: number;
}

export function ExamCard({
  id,
  title,
  description,
  status,
  startTime,
  duration,
  totalStudents,
  enrolledStudents,
  completedStudents,
  averageScore,
  questionCount,
}: ExamCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilExam = (startTime: string) => {
    const now = new Date();
    const examDate = new Date(startTime);
    const diffMs = examDate.getTime() - now.getTime();

    if (diffMs < 0) return 'Started';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'Starting soon';
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                status
              )}`}
            >
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          {description && (
            <p className="text-gray-600 text-sm mb-2">{description}</p>
          )}{' '}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalStudents} students
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              {questionCount} questions
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {duration} minutes
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className="text-right">
            {status === 'scheduled' && (
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {formatDateTime(startTime)}
                </div>
                <div className="text-blue-600">
                  {getTimeUntilExam(startTime)}
                </div>
              </div>
            )}
            {status === 'active' && (
              <div className="text-sm">
                <div className="font-medium text-green-600">In Progress</div>
                <div className="text-gray-600">
                  {completedStudents}/{enrolledStudents} completed
                </div>
              </div>
            )}
            {status === 'completed' && (
              <div className="text-sm">
                <div className="font-medium text-gray-900">Completed</div>
                <div className="text-gray-600">Avg: {averageScore}%</div>
              </div>
            )}
            {status === 'draft' && (
              <div className="text-sm">
                <div className="font-medium text-gray-600">Draft</div>
                <div className="text-gray-500">Not published</div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {status === 'draft' && (
              <>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Publish
                </Button>
              </>
            )}
            {status === 'scheduled' && (
              <>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Start Now
                </Button>
              </>
            )}
            {status === 'active' && (
              <Button variant="outline" size="sm">
                End Exam
              </Button>
            )}
            {status === 'completed' && (
              <Button variant="outline" size="sm">
                Results
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="More options" variant="outline" size="sm">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem>Copy invitation clipboard</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
