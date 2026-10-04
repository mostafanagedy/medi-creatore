import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreditsService, CREDIT_COSTS } from '../credits/credits.service';
import { AIGatewayService } from '../ai/ai-gateway.service';
import { GenerateScriptDto, ListScriptsQueryDto, UpdateScriptDto, VariationDto } from './dto/script.dto';

interface ScriptContent {
  hook: string;
  intro?: string;
  mainPoints: string[];
  story?: string;
  cta?: string;
  outro?: string;
  full: string;
}

const WORDS_PER_SECOND = 2.5;

@Injectable()
export class ScriptsService {
  private readonly logger = new Logger(ScriptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
    private readonly credits: CreditsService,
    private readonly ai: AIGatewayService,
  ) {}

  async generate(userId: string, dto: GenerateScriptDto) {
    await this.orgs.assertMember(userId, dto.organizationId, MemberRole.EDITOR);

    // Charge first (atomic, 402 if insufficient); refund if generation fails.
    const charge = await this.credits.consume(userId, 'SCRIPT_GENERATION', {
      description: `Script: ${dto.topic.slice(0, 80)}`,
      referenceType: 'script',
    });

    try {
      const { content, aiRequestId } = await this.callModel(userId, dto.organizationId, this.buildPrompt(dto));
      const wordCount = this.countWords(content.full);
      const script = await this.prisma.script.create({
        data: {
          organizationId: dto.organizationId,
          projectId: dto.projectId,
          createdByUserId: userId,
          title: content.hook.slice(0, 120) || dto.topic,
          topic: dto.topic,
          platform: dto.platform,
          contentType: dto.contentType,
          tone: dto.tone,
          language: dto.language ?? 'en',
          dialect: dto.dialect,
          targetAudience: dto.targetAudience,
          durationSec: dto.durationSec,
          goal: dto.goal,
          cta: dto.cta,
          keywords: dto.keywords ?? [],
          content: content as unknown as Prisma.InputJsonValue,
          wordCount,
          estimatedDurationSec: Math.round(wordCount / WORDS_PER_SECOND),
          aiRequestId,
          versions: { create: { version: 1, content: content as unknown as Prisma.InputJsonValue } },
        },
      });
      return { script, creditsCharged: charge.charged, balance: charge.balance };
    } catch (err) {
      await this.credits.refund(userId, CREDIT_COSTS.SCRIPT_GENERATION, {
        description: 'Refund: script generation failed',
        referenceType: 'script',
      });
      throw err;
    }
  }

  async variations(userId: string, id: string, dto: VariationDto) {
    const source = await this.getOwned(userId, id, MemberRole.EDITOR);
    const charge = await this.credits.consume(userId, 'SCRIPT_VARIATION', {
      description: 'Script variation',
      referenceType: 'script',
      referenceId: id,
    });

    try {
      const prompt =
        `Rewrite the following video script as a fresh variation.` +
        (dto.instruction ? ` Instruction: ${dto.instruction}.` : '') +
        ` Keep language "${source.language}".\n\nORIGINAL:\n${JSON.stringify(source.content)}\n\n${this.formatInstructions()}`;
      const { content, aiRequestId } = await this.callModel(userId, source.organizationId, prompt);
      const wordCount = this.countWords(content.full);
      const copy = await this.prisma.script.create({
        data: {
          organizationId: source.organizationId,
          projectId: source.projectId,
          createdByUserId: userId,
          title: `${source.title} (variation)`.slice(0, 200),
          topic: source.topic,
          platform: source.platform,
          contentType: source.contentType,
          tone: source.tone,
          language: source.language,
          keywords: source.keywords,
          content: content as unknown as Prisma.InputJsonValue,
          wordCount,
          estimatedDurationSec: Math.round(wordCount / WORDS_PER_SECOND),
          aiRequestId,
          versions: { create: { version: 1, content: content as unknown as Prisma.InputJsonValue } },
        },
      });
      return { script: copy, creditsCharged: charge.charged, balance: charge.balance };
    } catch (err) {
      await this.credits.refund(userId, CREDIT_COSTS.SCRIPT_VARIATION, {
        description: 'Refund: variation failed',
        referenceType: 'script',
        referenceId: id,
      });
      throw err;
    }
  }

  async list(userId: string, q: ListScriptsQueryDto) {
    await this.orgs.assertMember(userId, q.organizationId);
    const where: Prisma.ScriptWhereInput = {
      organizationId: q.organizationId,
      ...(q.projectId && { projectId: q.projectId }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.script.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.script.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }

  async get(userId: string, id: string) {
    const script = await this.getOwned(userId, id);
    const versions = await this.prisma.scriptVersion.findMany({
      where: { scriptId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, createdAt: true },
    });
    return { ...script, versions };
  }

  async update(userId: string, id: string, dto: UpdateScriptDto) {
    const script = await this.getOwned(userId, id, MemberRole.EDITOR);
    const contentChanged = dto.content !== undefined;
    const nextVersion = script.version + 1;
    const full = contentChanged ? String((dto.content as Partial<ScriptContent>).full ?? '') : '';
    const wordCount = contentChanged && full ? this.countWords(full) : undefined;

    return this.prisma.script.update({
      where: { id },
      data: {
        title: dto.title,
        projectId: dto.projectId,
        ...(contentChanged && {
          content: dto.content as Prisma.InputJsonValue,
          version: nextVersion,
          wordCount,
          estimatedDurationSec: wordCount ? Math.round(wordCount / WORDS_PER_SECOND) : undefined,
          versions: { create: { version: nextVersion, content: dto.content as Prisma.InputJsonValue } },
        }),
      },
    });
  }

  private async getOwned(userId: string, id: string, minRole: MemberRole = MemberRole.VIEWER) {
    const script = await this.prisma.script.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Script not found');
    await this.orgs.assertMember(userId, script.organizationId, minRole);
    return script;
  }

  private async callModel(userId: string, organizationId: string, prompt: string) {
    const res = await this.ai.generateText(
      {
        prompt,
        systemPrompt: 'You are an expert short-form video scriptwriter. Respond with valid JSON only.',
        maxTokens: 1800,
        temperature: 0.8,
      },
      { organizationId, userId, trackUsage: true, referenceType: 'script' },
    );
    return { content: this.parseContent(res.text), aiRequestId: undefined as string | undefined };
  }

  private buildPrompt(d: GenerateScriptDto): string {
    const parts = [
      `Write a video script about: "${d.topic}".`,
      d.platform && `Platform: ${d.platform}.`,
      d.contentType && `Format: ${d.contentType}.`,
      d.tone && `Tone: ${d.tone}.`,
      `Language: ${d.language ?? 'en'}${d.dialect ? ` (${d.dialect} dialect)` : ''}.`,
      d.targetAudience && `Target audience: ${d.targetAudience}.`,
      d.durationSec && `Target length: about ${d.durationSec} seconds (~${Math.round(d.durationSec * WORDS_PER_SECOND)} words).`,
      d.goal && `Goal: ${d.goal}.`,
      d.cta && `Call to action: ${d.cta}.`,
      d.keywords?.length && `Include keywords: ${d.keywords.join(', ')}.`,
    ].filter(Boolean);
    return `${parts.join(' ')}\n\n${this.formatInstructions()}`;
  }

  private formatInstructions() {
    return (
      'Return ONLY JSON: {"hook": string, "intro": string, "mainPoints": string[], ' +
      '"story": string, "cta": string, "outro": string, "full": string} ' +
      'where "full" is the complete script as spoken, in order.'
    );
  }

  /** Models sometimes wrap JSON in fences or prose; fall back to plain text. */
  private parseContent(raw: string): ScriptContent {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const p = JSON.parse(match[0]) as Partial<ScriptContent>;
        const full = p.full || [p.hook, p.intro, ...(p.mainPoints ?? []), p.story, p.cta, p.outro].filter(Boolean).join('\n\n');
        return {
          hook: p.hook ?? '',
          intro: p.intro,
          mainPoints: Array.isArray(p.mainPoints) ? p.mainPoints : [],
          story: p.story,
          cta: p.cta,
          outro: p.outro,
          full,
        };
      } catch {
        this.logger.warn('Model returned invalid JSON; storing raw text');
      }
    }
    const text = raw.trim();
    return { hook: (text.split('\n')[0] ?? '').slice(0, 120), mainPoints: [], full: text };
  }

  private countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
