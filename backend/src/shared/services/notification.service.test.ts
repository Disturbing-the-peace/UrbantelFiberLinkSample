import { NotificationService, NotificationRecipient } from './notification.service';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendNotification', () => {
    it('should send SMS when phone number is provided', async () => {
      const recipient: NotificationRecipient = {
        name: 'John Doe',
        phone: '+1234567890',
      };

      const results = await notificationService.sendNotification({
        recipient,
        message: 'Test message',
      });

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('sms');
      expect(results[0].success).toBe(true);
    });

    it('should return empty array when no contact info is provided', async () => {
      const recipient: NotificationRecipient = {
        name: 'John Doe',
      };

      const results = await notificationService.sendNotification({
        recipient,
        message: 'Test message',
      });

      expect(results).toHaveLength(0);
    });

    it('should handle invalid phone number', async () => {
      const recipient: NotificationRecipient = {
        name: 'John Doe',
        phone: '',
      };

      const results = await notificationService.sendNotification({
        recipient,
        message: 'Test message',
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Invalid phone number');
    });
  });

  describe('sendStatusChangeNotification', () => {
    const customer: NotificationRecipient = {
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
    };

    const agent: NotificationRecipient = {
      name: 'Agent Smith',
      phone: '+0987654321',
      email: 'agent@example.com',
    };

    it('should send notifications for Activated status', async () => {
      await notificationService.sendStatusChangeNotification(
        'Activated',
        'John Doe',
        'Premium Plan',
        undefined,
        customer,
        agent
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Activated notification to customer')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Activated notification to agent')
      );
    });

    it('should send notifications for Denied status with reason', async () => {
      await notificationService.sendStatusChangeNotification(
        'Denied',
        'John Doe',
        'Premium Plan',
        'Incomplete documentation',
        customer,
        agent
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Denied notification to customer')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Denied notification to agent')
      );
    });

    it('should send notifications for Voided status', async () => {
      await notificationService.sendStatusChangeNotification(
        'Voided',
        'John Doe',
        'Premium Plan',
        'Customer request',
        customer,
        agent
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Voided notification to customer')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending Voided notification to agent')
      );
    });

    it('should not send notifications for non-terminal statuses', async () => {
      await notificationService.sendStatusChangeNotification(
        'Under Review',
        'John Doe',
        'Premium Plan',
        undefined,
        customer,
        agent
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Status 'Under Review' does not trigger notifications")
      );
    });

    it('should send notifications to both customer and agent', async () => {
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

      await notificationService.sendStatusChangeNotification(
        'Activated',
        'John Doe',
        'Premium Plan',
        undefined,
        customer,
        agent
      );

      // Should be called twice: once for customer, once for agent
      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);
      
      // Verify customer notification
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: customer,
          message: expect.stringContaining('John Doe'),
        })
      );

      // Verify agent notification
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: agent,
          message: expect.stringContaining('John Doe'),
        })
      );
    });
  });
});
