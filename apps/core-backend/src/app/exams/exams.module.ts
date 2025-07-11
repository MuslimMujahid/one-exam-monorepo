import { Module } from '@nestjs/common';
import { TeacherExamsController } from './teacher-exams.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherExamsService } from './teacher-exams.service';
import { StudentExamService } from './student-exams.service';
import { StudentExamsController } from './student-exams.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StudentExamsController, TeacherExamsController],
  providers: [StudentExamService, TeacherExamsService],
  exports: [],
})
export class ExamsModule {}
