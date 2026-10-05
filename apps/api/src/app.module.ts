import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Config
import { validateConfig } from './config/app.config';

// Core modules
import { PrismaModule } from './modules/prisma/prisma.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { AIModule } from './modules/ai/ai.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CreditsModule } from './modules/credits/credits.module';
import { MediaModule } from './modules/media/media.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { HealthModule } from './modules/health/health.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
    }),
    EventEmitterModule.forRoot(),

    // Infrastructure & Features
    PrismaModule,
    AuthModule,
    AIModule,
    UsersModule,
    AuditModule,
    NotificationsModule,
    OrganizationsModule,
    ProjectsModule,
    CreditsModule,
    MediaModule,
    ScriptsModule,
    HealthModule,
    SocialModule,
  ],
})
export class AppModule {}
