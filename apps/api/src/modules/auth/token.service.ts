import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokens } from './auth.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(userId: string, ipAddress?: string): Promise<AuthTokens> {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const accessToken = this.jwtService.sign(
      { sub: userId, jti, type: 'access' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: refreshJti, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      },
    );

    // Calculate expiry dates
    const accessExpiry = this.parseExpiresIn(accessExpiresIn);
    const refreshExpiry = this.parseExpiresIn(refreshExpiresIn);

    // Store session
    await this.prisma.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken,
        ipAddress,
        expiresAt: new Date(Date.now() + accessExpiry),
        refreshExpiresAt: new Date(Date.now() + refreshExpiry),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(accessExpiry / 1000),
    };
  }

  async validateAccessToken(token: string): Promise<{ userId: string } | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'access') return null;

      const session = await this.prisma.session.findUnique({
        where: { token },
      });

      if (!session || !session.isValid || session.expiresAt < new Date()) {
        return null;
      }

      return { userId: payload.sub as string };
    } catch {
      return null;
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
}
