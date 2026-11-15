import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VideoRenderingProcessor, VideoRenderingJobData } from './video-rendering.processor';

describe('VideoRenderingProcessor', () => {
  let prisma: any;
  let processor: VideoRenderingProcessor;

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proj-123', name: 'Test Documentary', status: 'PROCESSING' }),
        update: jest.fn().mockResolvedValue({ id: 'proj-123' }),
      },
      video: {
        findFirst: jest.fn().mockResolvedValue({ id: 'vid-456', projectId: 'proj-123' }),
        create: jest.fn().mockResolvedValue({ id: 'vid-456' }),
        update: jest.fn().mockResolvedValue({ id: 'vid-456' }),
      },
    };

    processor = new VideoRenderingProcessor(prisma as unknown as PrismaService);
  });

  it('initializes with OpenMontage root directory detected', () => {
    expect(processor).toBeDefined();
  });

  it('processes rendering job and updates project & video statuses to COMPLETED', async () => {
    // Mock the child process execution runner
    jest.spyOn(processor as any, 'executeOpenMontageRunner').mockResolvedValue({
      status: 'completed',
      final_video_path: '/path/to/final.mp4',
      duration_seconds: 180,
      resolution: '1080p',
    });

    const job = {
      id: 'bull-job-1',
      data: {
        type: 'video:rendering',
        videoProjectId: 'proj-123',
        userId: 'user-789',
        organizationId: 'org-999',
        resolution: '1080p',
        fps: 30,
      } as VideoRenderingJobData,
      updateProgress: jest.fn().mockResolvedValue(true),
    } as unknown as Job<VideoRenderingJobData>;

    const result = await processor.process(job);

    expect(result).toEqual({
      status: 'completed',
      videoUrl: '/path/to/final.mp4',
      duration: 180,
    });

    expect(job.updateProgress).toHaveBeenCalledWith(5);
    expect(job.updateProgress).toHaveBeenCalledWith(100);

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-123' },
        data: { status: 'COMPLETED' },
      }),
    );

    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vid-456' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          fileUrl: '/path/to/final.mp4',
        }),
      }),
    );
  });

  it('marks video and project as FAILED when runner fails', async () => {
    jest.spyOn(processor as any, 'executeOpenMontageRunner').mockRejectedValue(new Error('Runner crashed'));

    const job = {
      id: 'bull-job-err',
      data: {
        type: 'video:rendering',
        videoProjectId: 'proj-123',
        userId: 'user-789',
        organizationId: 'org-999',
      } as VideoRenderingJobData,
      updateProgress: jest.fn().mockResolvedValue(true),
    } as unknown as Job<VideoRenderingJobData>;

    await expect(processor.process(job)).rejects.toThrow('Runner crashed');

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-123' },
        data: { status: 'DRAFT' },
      }),
    );

    expect(prisma.video.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vid-456' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Runner crashed',
        }),
      }),
    );
  });
});
