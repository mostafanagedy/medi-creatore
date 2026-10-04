import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { CreditsModule } from '../credits/credits.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ScriptsController } from './scripts.controller';
import { ScriptsService } from './scripts.service';

@Module({
  imports: [AIModule, CreditsModule, OrganizationsModule],
  controllers: [ScriptsController],
  providers: [ScriptsService],
  exports: [ScriptsService],
})
export class ScriptsModule {}
