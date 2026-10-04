import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScriptsService } from './scripts.service';
import { GenerateScriptDto, ListScriptsQueryDto, UpdateScriptDto, VariationDto } from './dto/script.dto';

@Controller('scripts')
@UseGuards(JwtAuthGuard)
export class ScriptsController {
  constructor(private readonly scripts: ScriptsService) {}

  @Post('generate')
  generate(@CurrentUser() user: User, @Body() dto: GenerateScriptDto) {
    return this.scripts.generate(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListScriptsQueryDto) {
    return this.scripts.list(user.id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.scripts.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateScriptDto) {
    return this.scripts.update(user.id, id, dto);
  }

  @Post(':id/variations')
  variations(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: VariationDto) {
    return this.scripts.variations(user.id, id, dto);
  }
}
