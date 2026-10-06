import { Body, Controller, Get, Patch, Param, UseGuards, ForbiddenException, Post } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto, UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  update(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get()
  async getAllUsers(@CurrentUser() user: User) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view all users');
    }
    return this.users.getAllUsers();
  }

  @Patch(':id/suspend')
  async toggleSuspend(
    @CurrentUser() user: User, 
    @Param('id') targetId: string, 
    @Body('suspend') suspend: boolean
  ) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can perform this action');
    }
    return this.users.toggleSuspend(user.id, targetId, suspend);
  }

  @Patch(':id/role')
  async changeRole(
    @CurrentUser() user: User,
    @Param('id') targetId: string,
    @Body('role') role: UserRole
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change user roles');
    }
    return this.users.changeRole(user.id, targetId, role);
  }

  @Post(':id/credits')
  async manageCredits(
    @CurrentUser() user: User,
    @Param('id') targetId: string,
    @Body('amount') amount: number
  ) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can manage credits');
    }
    return this.users.manageCredits(user.id, targetId, amount);
  }
}
