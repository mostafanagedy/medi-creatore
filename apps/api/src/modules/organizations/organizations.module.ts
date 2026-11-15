import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService, InvitationsService],
  exports: [OrganizationsService, InvitationsService],
})
export class OrganizationsModule {}
