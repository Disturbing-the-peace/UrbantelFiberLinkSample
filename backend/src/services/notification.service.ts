/**
 * Notification Service
 * 
 * Handles SMS notifications for application status changes.
 * 
 * Note: SMS Gateway integration is a placeholder implementation
 * that should be replaced with actual provider integration.
 */

export interface NotificationRecipient {
  name: string;
  phone?: string;
  email?: string;
}

export interface NotificationPayload {
  recipient: NotificationRecipient;
  message: string;
  subject?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: 'sms';
  error?: string;
}

/**
 * SMS Gateway Service (Placeholder Implementation)
 * 
 * Replace this with actual SMS provider integration (e.g., Twilio, Vonage, etc.)
 */
class SMSGatewayService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    // Load from environment variables
    this.apiKey = process.env.SMS_GATEWAY_API_KEY || 'placeholder-api-key';
    this.apiUrl = process.env.SMS_GATEWAY_API_URL || 'https://api.sms-provider.com/send';
  }

  /**
   * Send SMS message
   * 
   * @param phone - Recipient phone number
   * @param message - Message content
   * @returns Promise with result
   */
  async sendSMS(phone: string, message: string): Promise<NotificationResult> {
    try {
      // Validate phone number
      if (!phone || phone.trim() === '') {
        return {
          success: false,
          channel: 'sms',
          error: 'Invalid phone number',
        };
      }

      // TODO: Replace with actual SMS provider API call
      // Example for Twilio:
      // const response = await fetch(this.apiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     to: phone,
      //     message: message,
      //   }),
      // });

      console.log(`[SMS Gateway] Sending SMS to ${phone}: ${message}`);
      
      // Simulate successful send in development
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log('[SMS Gateway] SMS sent successfully (simulated)');
        return {
          success: true,
          channel: 'sms',
        };
      }

      // In production, this should throw an error if not configured
      throw new Error('SMS Gateway not configured. Please set SMS_GATEWAY_API_KEY and SMS_GATEWAY_API_URL');
    } catch (error) {
      console.error('[SMS Gateway] Error sending SMS:', error);
      return {
        success: false,
        channel: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Main Notification Service
 * 
 * Orchestrates SMS notifications
 */
export class NotificationService {
  private smsGateway: SMSGatewayService;

  constructor() {
    this.smsGateway = new SMSGatewayService();
  }

  /**
   * Send notification via SMS
   * 
   * @param payload - Notification payload with recipient and message
   * @returns Array of results for each channel
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Send SMS if phone number is provided (even if empty, to get validation error)
    if (payload.recipient.phone !== undefined) {
      const smsResult = await this.smsGateway.sendSMS(
        payload.recipient.phone,
        payload.message
      );
      results.push(smsResult);
    }

    return results;
  }

  /**
   * Send application status change notification
   * 
   * @param status - New application status
   * @param customerName - Customer's full name
   * @param planName - Plan name
   * @param statusReason - Optional reason for Denied/Voided status
   * @param customer - Customer recipient info
   * @param agent - Agent recipient info
   */
  async sendStatusChangeNotification(
    status: string,
    customerName: string,
    planName: string,
    statusReason: string | undefined,
    customer: NotificationRecipient,
    agent: NotificationRecipient
  ): Promise<void> {
    // Only send notifications for terminal statuses
    const notifiableStatuses = ['Activated', 'Denied', 'Voided'];
    if (!notifiableStatuses.includes(status)) {
      console.log(`[Notification Service] Status '${status}' does not trigger notifications`);
      return;
    }

    // Build message based on status
    let customerMessage = '';
    let agentMessage = '';

    switch (status) {
      case 'Activated':
        customerMessage = `Hello ${customerName}! Your UrbanConnect ${planName} subscription has been activated. Welcome aboard!`;
        agentMessage = `Good news! Your referral ${customerName} for ${planName} has been activated. Commission will be processed.`;
        break;
      
      case 'Denied':
        customerMessage = `Hello ${customerName}. Unfortunately, your application for ${planName} has been denied.${statusReason ? ` Reason: ${statusReason}` : ''}`;
        agentMessage = `Your referral ${customerName} for ${planName} has been denied.${statusReason ? ` Reason: ${statusReason}` : ''}`;
        break;
      
      case 'Voided':
        customerMessage = `Hello ${customerName}. Your application for ${planName} has been voided.${statusReason ? ` Reason: ${statusReason}` : ''}`;
        agentMessage = `Your referral ${customerName} for ${planName} has been voided.${statusReason ? ` Reason: ${statusReason}` : ''}`;
        break;
    }

    // Send notification to customer
    console.log(`[Notification Service] Sending ${status} notification to customer: ${customerName}`);
    const customerResults = await this.sendNotification({
      recipient: customer,
      message: customerMessage,
    });

    // Log customer notification results
    customerResults.forEach(result => {
      if (result.success) {
        console.log(`[Notification Service] Customer notification sent via ${result.channel}`);
      } else {
        console.error(`[Notification Service] Failed to send customer notification via ${result.channel}: ${result.error}`);
      }
    });

    // Send notification to agent
    console.log(`[Notification Service] Sending ${status} notification to agent: ${agent.name}`);
    const agentResults = await this.sendNotification({
      recipient: agent,
      message: agentMessage,
    });

    // Log agent notification results
    agentResults.forEach(result => {
      if (result.success) {
        console.log(`[Notification Service] Agent notification sent via ${result.channel}`);
      } else {
        console.error(`[Notification Service] Failed to send agent notification via ${result.channel}: ${result.error}`);
      }
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
