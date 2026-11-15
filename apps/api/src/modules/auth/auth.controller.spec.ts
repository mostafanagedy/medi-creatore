import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

describe("AuthController OAuth callback", () => {
  it("sets the refresh cookie and redirects without exposing the access token", async () => {
    const authService = {} as AuthService;
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "FRONTEND_URL") return "https://frontend.example";
        if (key === "NODE_ENV") return "production";
        return undefined;
      }),
    } as unknown as ConfigService;
    const controller = new AuthController(authService, configService);
    const response = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response;
    const request = {
      user: {
        user: { id: "user-id" },
        tokens: {
          accessToken: "access-token-secret",
          refreshToken: "refresh-token-secret",
        },
      },
    } as unknown as Request;

    await controller.googleCallback(request, response);

    expect(response.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "refresh-token-secret",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        path: "/api/v1/auth",
      }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      "https://frontend.example/auth/callback",
    );
    expect(response.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining("access-token-secret"),
    );
  });
});
