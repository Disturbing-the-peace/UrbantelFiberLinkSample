import { supabase } from '../../shared/config/supabase';
import * as cron from 'node-cron';
import { logger } from '../../shared/utils/logger';

interface PurgeResult {
  subscriberId: string;
  fieldsPurged: string[];
  filesDeleted: string[];
}

/**
 * Data Purge Service
 * Handles automated purging of sensitive data for activated subscribers
 * after 3+ days from activation date
 */
export class DataPurgeService {
  private static instance: DataPurgeService;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): DataPurgeService {
    if (!DataPurgeService.instance) {
      DataPurgeService.instance = new DataPurgeService();
    }
    return DataPurgeService.instance;
  }

  /**
   * Start the daily purge scheduler (runs at 2 AM daily)
   */
  startScheduler(): void {
    if (this.cronJob) {
      logger.warn('Data purge scheduler is already running');
      return;
    }

    // Schedule to run daily at 2:00 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled data purge job...');
      try {
        const results = await this.executePurge();
        logger.info(`Data purge completed. Purged ${results.length} records.`);
      } catch (error) {
        logger.error('Error during scheduled data purge:', error);
      }
    });

    logger.info('Data purge scheduler started (runs daily at 2:00 AM)');
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Data purge scheduler stopped');
    }
  }

  /**
   * Execute the data purge process
   * Finds activated subscribers where activation date is 3+ days ago
   * and purges sensitive data
   */
  async executePurge(): Promise<PurgeResult[]> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Query for activated subscribers that haven't been purged yet
    const { data: subscribers, error: queryError } = await supabase
      .from('applications')
      .select('id, birthday, house_photo_url, government_id_url, id_selfie_url, signature_url, activated_at')
      .eq('status', 'Activated')
      .eq('data_purged', false)
      .lte('activated_at', threeDaysAgo.toISOString());

    if (queryError) {
      throw new Error(`Failed to query subscribers for purge: ${queryError.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      logger.info('No subscribers found for data purge');
      return [];
    }

    const results: PurgeResult[] = [];

    for (const subscriber of subscribers) {
      try {
        const result = await this.purgeSubscriberData(subscriber);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to purge data for subscriber ${subscriber.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Purge sensitive data for a single subscriber
   */
  private async purgeSubscriberData(subscriber: any): Promise<PurgeResult> {
    const fieldsPurged: string[] = [];
    const filesDeleted: string[] = [];

    // Delete files from Supabase Storage
    const fileFields = [
      { field: 'house_photo_url', url: subscriber.house_photo_url },
      { field: 'government_id_url', url: subscriber.government_id_url },
      { field: 'id_selfie_url', url: subscriber.id_selfie_url },
      { field: 'signature_url', url: subscriber.signature_url }
    ];

    for (const fileField of fileFields) {
      if (fileField.url) {
        try {
          // Extract file path from URL
          const filePath = this.extractFilePathFromUrl(fileField.url);
          if (filePath) {
            const { error: deleteError } = await supabase.storage
              .from('application-documents')
              .remove([filePath]);

            if (deleteError) {
              logger.error(`Failed to delete file ${filePath}:`, deleteError.message);
            } else {
              filesDeleted.push(filePath);
            }
          }
        } catch (error) {
          logger.error(`Error deleting file for ${fileField.field}:`, error);
        }
      }
    }

    // Update database: set sensitive fields to null and mark as purged
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        birthday: null,
        house_photo_url: null,
        government_id_url: null,
        id_selfie_url: null,
        signature_url: null,
        data_purged: true,
        data_purged_at: new Date().toISOString()
      })
      .eq('id', subscriber.id);

    if (updateError) {
      throw new Error(`Failed to update subscriber ${subscriber.id}: ${updateError.message}`);
    }

    fieldsPurged.push('birthday', 'house_photo_url', 'government_id_url', 'id_selfie_url', 'signature_url');

    // Log to audit_log table
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        action: 'DATA_PURGE',
        entity_type: 'application',
        entity_id: subscriber.id,
        fields_purged: fieldsPurged,
        files_deleted: filesDeleted,
        performed_by: 'SYSTEM',
        performed_at: new Date().toISOString(),
        metadata: {
          activated_at: subscriber.activated_at,
          purge_trigger: 'automated_3_day_retention'
        }
      });

    if (auditError) {
      logger.error(`Failed to create audit log for subscriber ${subscriber.id}:`, auditError.message);
    }

    return {
      subscriberId: subscriber.id,
      fieldsPurged,
      filesDeleted
    };
  }

  /**
   * Extract file path from Supabase Storage URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf('application-documents');
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to parse storage URL:', error);
      return null;
    }
  }

  /**
   * Manual purge trigger (for testing or manual operations)
   */
  async manualPurge(): Promise<PurgeResult[]> {
    logger.info('Executing manual data purge...');
    return this.executePurge();
  }
}

// Export singleton instance
export const dataPurgeService = DataPurgeService.getInstance();
