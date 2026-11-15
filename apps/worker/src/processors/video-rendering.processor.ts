import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue-names';
import { PrismaService } from '../prisma/prisma.service';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface VideoRenderingJobData {
  type: 'video:rendering';
  videoProjectId: string;
  userId: string;
  organizationId: string;
  outputFormat?: 'mp4' | 'webm' | 'mov';
  resolution?: '1080p' | '720p' | '480p' | '4k';
  fps?: number;
  creditsCharged?: number;
  idempotencyKey?: string;
}

function findOpenMontageRoot(): string {
  if (process.env.OPENMONTAGE_ROOT && fs.existsSync(process.env.OPENMONTAGE_ROOT)) {
    return process.env.OPENMONTAGE_ROOT;
  }
  let curr = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(curr, 'AGENT_GUIDE.md')) && fs.existsSync(path.join(curr, 'pipeline_defs'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(process.cwd(), '..');
}

@Processor(QUEUE_NAMES.VIDEO_RENDERING)
export class VideoRenderingProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoRenderingProcessor.name);
  private readonly openMontageRoot = findOpenMontageRoot();

  constructor(private readonly prisma: PrismaService) {
    super();
    this.logger.log(`Initialized OpenMontage VideoRenderingProcessor with root: ${this.openMontageRoot}`);
  }

  async process(job: Job<VideoRenderingJobData>): Promise<{ status: string; videoUrl: string; duration: number }> {
    const { videoProjectId, userId, organizationId, resolution = '1080p', fps = 30 } = job.data;
    this.logger.log(`Starting OpenMontage rendering for project ${videoProjectId} (job ${job.id})`);

    await job.updateProgress(5);

    // 1. Fetch or initialize Project record in Prisma
    let projectTitle = videoProjectId;
    try {
      const project = await this.prisma.project.findFirst({
        where: { id: videoProjectId },
        select: { id: true, name: true, status: true },
      });
      if (project) {
        projectTitle = project.name;
        await this.prisma.project.update({
          where: { id: videoProjectId },
          data: { status: 'PROCESSING' },
        });
      }
    } catch (dbErr) {
      this.logger.warn(`Could not query project table directly: ${dbErr}`);
    }

    // 2. Locate or create Video tracking entry in Prisma
    let videoRecordId: string | null = null;
    try {
      const existingVideo = await this.prisma.video.findFirst({
        where: { projectId: videoProjectId },
        select: { id: true },
      });
      if (existingVideo) {
        videoRecordId = existingVideo.id;
        await this.prisma.video.update({
          where: { id: videoRecordId },
          data: { status: 'PROCESSING', renderJobId: job.id?.toString() },
        });
      } else {
        const newVideo = await this.prisma.video.create({
          data: {
            organizationId,
            projectId: videoProjectId,
            createdByUserId: userId,
            title: projectTitle,
            status: 'PROCESSING',
            resolution,
            fps,
            renderJobId: job.id?.toString(),
          },
          select: { id: true },
        });
        videoRecordId = newVideo.id;
      }
    } catch (vErr) {
      this.logger.warn(`Video record tracking setup skipped or deferred: ${vErr}`);
    }

    // 3. Execute OpenMontage Runner Bridge via child process
    try {
      const result = await this.executeOpenMontageRunner(videoProjectId, projectTitle, resolution, job);
      await job.updateProgress(100);

      // 4. Update Video and Project in Database
      if (videoRecordId) {
        try {
          await this.prisma.video.update({
            where: { id: videoRecordId },
            data: {
              status: 'COMPLETED',
              fileUrl: result.final_video_path,
              previewUrl: result.final_video_path,
              durationSec: Math.round(result.duration_seconds || 0),
              resolution: result.resolution || resolution,
              fps,
              fileSize: result.file_size_bytes ? BigInt(result.file_size_bytes) : null,
              metadata: result.render_report || {},
            },
          });
        } catch (upErr) {
          this.logger.error(`Failed to update video record ${videoRecordId}: ${upErr}`);
        }
      }

      try {
        await this.prisma.project.updateMany({
          where: { id: videoProjectId },
          data: { status: 'COMPLETED' },
        });
      } catch (pUpErr) {
        this.logger.warn(`Project status update deferred: ${pUpErr}`);
      }

      this.logger.log(`Render completed successfully for ${videoProjectId}: ${result.final_video_path}`);
      return {
        status: 'completed',
        videoUrl: result.final_video_path,
        duration: result.duration_seconds,
      };
    } catch (err: any) {
      this.logger.error(`OpenMontage rendering failed for project ${videoProjectId}: ${err.message}`, err.stack);
      if (videoRecordId) {
        try {
          await this.prisma.video.update({
            where: { id: videoRecordId },
            data: {
              status: 'FAILED',
              errorMessage: err.message,
            },
          });
        } catch (failErr) {
          this.logger.warn(`Could not set video record to FAILED: ${failErr}`);
        }
      }
      throw new UnrecoverableError(`OpenMontage execution error: ${err.message}`);
    }
  }

  private executeOpenMontageRunner(
    projectId: string,
    title: string,
    resolution: string,
    job: Job<VideoRenderingJobData>,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const runnerScript = path.join(this.openMontageRoot, 'tools/video/runner_bridge.py');
      const pythonBin = path.join(this.openMontageRoot, '.venv/bin/python');

      const args = [
        runnerScript,
        '--project-id', projectId,
        '--title', title,
        '--resolution', resolution,
        '--action', 'render',
      ];

      this.logger.log(`Spawning OpenMontage Runner: ${pythonBin} ${args.join(' ')}`);

      const proc = spawn(pythonBin, args, {
        cwd: this.openMontageRoot,
        env: {
          ...process.env,
          PYTHONPATH: this.openMontageRoot,
        },
      });

      let stdoutAccum = '';
      let stderrAccum = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdoutAccum += text;
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const payloadStr = line.substring(line.indexOf(' ') + 1);
              const payload = JSON.parse(payloadStr);
              const percent = payload.percent || 0;
              job.updateProgress(percent).catch(() => {});
              this.logger.debug(`[${projectId}] Stage ${payload.stage || 'compose'} -> ${percent}%: ${payload.message || ''}`);
            } catch (pErr) {
              // Ignore progress parse anomalies
            }
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrAccum += chunk.toString();
      });

      proc.on('close', (code: number) => {
        if (code !== 0) {
          return reject(new Error(`Runner exited with code ${code}. Stderr: ${stderrAccum}`));
        }

        // Locate the final JSON object in stdout
        const jsonMatch = stdoutAccum.match(/\{[\s\S]*"status":\s*"success"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return resolve(parsed);
          } catch (jErr) {
            return reject(new Error(`Failed to parse final runner JSON output: ${jErr}`));
          }
        }

        // Fallback: Check if file exists on disk directly
        const expectedPath = path.join(this.openMontageRoot, 'projects', projectId, 'renders', 'final.mp4');
        if (fs.existsSync(expectedPath)) {
          return resolve({
            status: 'success',
            final_video_path: expectedPath,
            duration_seconds: 0,
          });
        }

        return reject(new Error(`Runner finished with 0 but no final video JSON found. Output: ${stdoutAccum}`));
      });
    });
  }
}
