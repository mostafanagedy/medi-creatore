import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { ConfigService } from "@nestjs/config";
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  TextProviderCallOptions,
} from "../interfaces/ai-provider.interface";

@Injectable()
export class AnthropicProvider implements TextProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null = null;
  readonly providerName = "anthropic";

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (apiKey && !apiKey.startsWith('sk-ant-your-') && !apiKey.includes('change-me') && !apiKey.includes('your-')) {
      this.client = new Anthropic({ apiKey });
      this.logger.log("Anthropic provider initialized");
    } else {
      this.logger.warn(
        "ANTHROPIC_API_KEY not configured or has placeholder — Anthropic provider disabled",
      );
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async generateText(
    request: TextGenerationRequest,
    options: TextProviderCallOptions = {},
  ): Promise<TextGenerationResponse> {
    const client = options.apiKey
      ? new Anthropic({ apiKey: options.apiKey })
      : this.client;
    if (!client) throw new Error("Anthropic not configured");

    const start = Date.now();

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: request.prompt },
    ];

    const response = await client.messages.create({
      model: options.model ?? "claude-sonnet-4-5",
      max_tokens: request.maxTokens ?? 2048,
      system: request.systemPrompt,
      messages,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.content[0];
    const text = content?.type === "text" ? content.text : "";

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model,
      provider: this.providerName,
      finishReason: response.stop_reason ?? undefined,
      durationMs: Date.now() - start,
    };
  }
}
