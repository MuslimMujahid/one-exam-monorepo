import { Module } from '@nestjs/common';
import { TeacherExamsController } from './teacher-exams.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherExamsService } from './teacher-exams.service';
import { StudentExamService } from './student-exams.service';
import { StudentExamsController } from './student-exams.controller';
import { ExamSessionController } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    StudentExamsController,
    TeacherExamsController,
    ExamSessionController,
  ],
  providers: [StudentExamService, TeacherExamsService, ExamSessionService],
  exports: [],
})
export class ExamsModule {}
