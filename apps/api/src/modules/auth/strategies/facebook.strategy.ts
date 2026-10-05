import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    console.log('--- DEBUG FACEBOOK ---');
    console.log('META_CLIENT_ID:', configService.get<string>('META_CLIENT_ID'));
    console.log('process.env.META_CLIENT_ID:', process.env.META_CLIENT_ID);
    console.log('----------------------');

    super({
      clientID: configService.get<string>('META_CLIENT_ID') || configService.get<string>('META_APP_ID') || 'dummy-client-id',
      clientSecret: configService.get<string>('META_CLIENT_SECRET') || 'dummy-secret',
      callbackURL: `${configService.get<string>('API_URL', 'http://localhost:3001')}/api/v1/auth/facebook/callback`,
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email from Facebook'), undefined);
    }

    try {
      const result = await this.authService.handleOAuthLogin(
        'facebook',
        profile.id,
        email,
        profile.displayName ?? email,
        profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
      );
      done(null, result);
    } catch (err) {
      done(err, undefined);
    }
  }
}
