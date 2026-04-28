import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_ID = 100;
let isActive = false;

export const PipelineNotifications = {
  async ensurePermission(): Promise<boolean> {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const { display: newDisplay } = await LocalNotifications.requestPermissions();
    return newDisplay === 'granted';
  },

  async start(status: string): Promise<void> {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) {
      console.warn('LocalNotifications permission not granted');
      return;
    }

    isActive = true;
    await this.update(status);
  },

  async update(status: string): Promise<void> {
    if (!isActive) return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_ID,
            title: 'AI Newsroom',
            body: status,
            ongoing: true,
            autoCancel: false,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
    } catch (err) {
      console.warn('LocalNotifications.schedule failed:', err);
    }
  },

  async stop(): Promise<void> {
    if (!isActive) return;
    isActive = false;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    } catch (err) {
      console.warn('LocalNotifications.cancel failed:', err);
    }
  },
};
