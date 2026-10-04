import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, InviteMemberDto, UpdateOrganizationDto } from './dto/organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.orgs.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orgs.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orgs.remove(user.id, id);
  }

  @Get(':id/members')
  members(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orgs.listMembers(user.id, id);
  }

  @Post(':id/members')
  addMember(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.orgs.addMember(user.id, id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@CurrentUser() user: User, @Param('id') id: string, @Param('userId') memberId: string) {
    return this.orgs.removeMember(user.id, id, memberId);
  }
}
