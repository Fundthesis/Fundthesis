export interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  message?: string;
  lastUpdated?: string;
}

export const systemStatus: SystemStatus = {
  status: 'operational',
  message: 'All systems operational',
  lastUpdated: new Date().toISOString(),
};

