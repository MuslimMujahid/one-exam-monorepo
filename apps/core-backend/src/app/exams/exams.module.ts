import { Module } from '@nestjs/common';
import { ExamsController } from './teacher-exams.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherExamsService } from './teacher-exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController],
  providers: [TeacherExamsService],
  exports: [],
})
export class ExamsModule {}
