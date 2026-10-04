import { Controller, Get, ServiceUnavailableException, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unauthenticated, version-neutral health endpoints (served at /api/health).
 * - GET /api/health        liveness  — process is up (used by Docker HEALTHCHECK)
 * - GET /api/health/ready  readiness — dependencies reachable (used by load balancers)
 */
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks database)' })
  async ready() {
    const database = await this.prisma.healthCheck();
    if (!database) {
      throw new ServiceUnavailableException({ status: 'unavailable', checks: { database: 'down' } });
    }
    return { status: 'ok', checks: { database: 'up' } };
  }
}
