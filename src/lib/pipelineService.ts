import { registerPlugin } from '@capacitor/core';

export interface PipelineStatusPlugin {
  start(options: { status: string }): Promise<{ success: boolean }>;
  updateStatus(options: { status: string }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
}

const PipelineStatus = registerPlugin<PipelineStatusPlugin>('PipelineStatus');

let isRunning = false;

export const PipelineService = {
  async start(status: string): Promise<void> {
    try {
      await PipelineStatus.start({ status });
      isRunning = true;
    } catch (err) {
      console.warn('PipelineService.start failed:', err);
    }
  },

  async updateStatus(status: string): Promise<void> {
    if (!isRunning) return;
    try {
      await PipelineStatus.updateStatus({ status });
    } catch (err) {
      console.warn('PipelineService.updateStatus failed:', err);
    }
  },

  async stop(): Promise<void> {
    if (!isRunning) return;
    try {
      await PipelineStatus.stop();
      isRunning = false;
    } catch (err) {
      console.warn('PipelineService.stop failed:', err);
    }
  },
};
