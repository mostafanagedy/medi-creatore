import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRenderGateway } from './project-render.gateway';
import { QUEUE_NAMES } from '../../queues/queue-names';

@Module({
  imports: [
    OrganizationsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.VIDEO_RENDERING,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: false,
      },
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectRenderGateway],
  exports: [ProjectsService, ProjectRenderGateway],
})
export class ProjectsModule {}
