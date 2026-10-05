import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy',
      callbackURL: `${configService.get<string>('API_URL', 'http://localhost:3001')}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName?: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email from Google'), undefined);
    }

    try {
      const result = await this.authService.handleOAuthLogin(
        'google',
        profile.id,
        email,
        profile.displayName ?? email,
        profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
      );
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
