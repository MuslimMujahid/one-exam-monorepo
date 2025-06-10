import { notFound, redirect } from 'next/navigation';
import { getExamById } from '../../../../services/get-exam-by-id';
import ExamEditor from '../../../../components/exams/ExamEditor';
import { Suspense } from 'react';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditExamPage({ params }: PageProps) {
  const { id: examId } = await params;

  if (!examId) {
    redirect('/dashboard');
  }

  const examData = await getExamById({
    examId,
  });

  if (!examData) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExamEditor
        examId={examId}
        initialData={examData.data}
        isEditMode={true}
      />
    </Suspense>
  );
}
