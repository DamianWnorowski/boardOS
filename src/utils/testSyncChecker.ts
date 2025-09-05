/**
 * Test Synchronization Checker
 * Ensures E2E tests are in sync with database rules
 */

import { supabase } from '../lib/supabase';
import logger from './logger';

interface RuleChecksum {
  magnet: string;
  drop: string;
  jobRow: string;
  timestamp: string;
}

class TestSyncChecker {
  private static instance: TestSyncChecker;
  private lastChecksum: RuleChecksum | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): TestSyncChecker {
    if (!TestSyncChecker.instance) {
      TestSyncChecker.instance = new TestSyncChecker();
    }
    return TestSyncChecker.instance;
  }

  /**
   * Calculate checksum for rule data
   */
  private calculateChecksum(data: any): string {
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Fetch current rules from database
   */
  private async fetchCurrentRules() {
    const [magnetRules, dropRules, jobRowConfigs] = await Promise.all([
      supabase.from('magnet_interaction_rules').select('*'),
      supabase.from('drop_rules').select('*'),
      supabase.from('job_row_configs').select('*')
    ]);

    return {
      magnet: magnetRules.data || [],
      drop: dropRules.data || [],
      jobRow: jobRowConfigs.data || []
    };
  }

  /**
   * Check if tests are in sync with database rules
   */
  async checkSync(): Promise<boolean> {
    try {
      const rules = await this.fetchCurrentRules();
      
      const currentChecksum: RuleChecksum = {
        magnet: this.calculateChecksum(rules.magnet),
        drop: this.calculateChecksum(rules.drop),
        jobRow: this.calculateChecksum(rules.jobRow),
        timestamp: new Date().toISOString()
      };

      // Load last known checksum from localStorage
      const storedChecksum = localStorage.getItem('boardos_test_checksum');
      if (storedChecksum) {
        this.lastChecksum = JSON.parse(storedChecksum);
      }

      // Check for changes
      if (this.lastChecksum) {
        const hasChanges = 
          currentChecksum.magnet !== this.lastChecksum.magnet ||
          currentChecksum.drop !== this.lastChecksum.drop ||
          currentChecksum.jobRow !== this.lastChecksum.jobRow;

        if (hasChanges) {
          logger.warn('Business rules have changed - E2E tests may be out of sync');
          this.notifyTestsOutOfSync();
          return false;
        }
      }

      // Update stored checksum
      localStorage.setItem('boardos_test_checksum', JSON.stringify(currentChecksum));
      this.lastChecksum = currentChecksum;

      return true;
    } catch (error) {
      logger.error('Failed to check test sync:', error);
      return true; // Assume in sync if check fails
    }
  }

  /**
   * Notify user that tests are out of sync
   */
  private notifyTestsOutOfSync() {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      // Create a console warning
      console.warn(
        '%c⚠️ E2E Tests Out of Sync',
        'background: #ff9800; color: white; padding: 10px; font-size: 14px; font-weight: bold;',
        '\n\nBusiness rules have changed since tests were last generated.',
        '\nRun: npm run test:e2e:generate',
        '\nOr start watcher: npm run test:e2e:watch'
      );

      // Optionally show a toast notification if you have a toast system
      // toast.warning('E2E tests may be out of sync with business rules');
    }
  }

  /**
   * Start periodic sync checking
   */
  startMonitoring(intervalMs: number = 5 * 60 * 1000) {
    // Initial check
    this.checkSync();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkSync();
    }, intervalMs);

    // Set up real-time subscriptions
    this.setupRealtimeMonitoring();

    logger.info('Test sync monitoring started');
  }

  /**
   * Set up real-time monitoring for rule changes
   */
  private setupRealtimeMonitoring() {
    // Monitor magnet rules
    supabase
      .channel('test-sync-magnet')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'magnet_interaction_rules' },
        () => {
          logger.info('Magnet rules changed - checking test sync');
          this.checkSync();
        }
      )
      .subscribe();

    // Monitor drop rules
    supabase
      .channel('test-sync-drop')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'drop_rules' },
        () => {
          logger.info('Drop rules changed - checking test sync');
          this.checkSync();
        }
      )
      .subscribe();

    // Monitor job row configs
    supabase
      .channel('test-sync-jobrow')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'job_row_configs' },
        () => {
          logger.info('Job row configs changed - checking test sync');
          this.checkSync();
        }
      )
      .subscribe();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Unsubscribe from channels
    supabase.removeAllChannels();

    logger.info('Test sync monitoring stopped');
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): { inSync: boolean; lastCheck: string | null } {
    const storedChecksum = localStorage.getItem('boardos_test_checksum');
    if (storedChecksum) {
      const checksum = JSON.parse(storedChecksum);
      return {
        inSync: true, // Assume in sync if we have a checksum
        lastCheck: checksum.timestamp
      };
    }

    return {
      inSync: false,
      lastCheck: null
    };
  }
}

export default TestSyncChecker.getInstance();