# Notification Service Integration Guide

## Overview

The notification service provides multi-channel notifications (SMS and Facebook Messenger) for application status changes in the UrbanConnect ISP System. Currently, the service uses placeholder implementations that simulate successful sends in development/test environments.

## Current Implementation

The notification service is triggered automatically when an application status changes to one of the following terminal statuses:
- **Activated**: Customer's subscription is activated
- **Denied**: Application is rejected
- **Voided**: Application is cancelled

Notifications are sent to:
1. **Customer**: Via SMS (if phone number is available)
2. **Referring Agent**: Via SMS and Facebook Messenger (if contact info is available)

## Integration Points

### 1. SMS Gateway Integration

**File**: `backend/src/services/notification.service.ts`

**Class**: `SMSGatewayService`

**Environment Variables**:
```env
SMS_GATEWAY_API_KEY=your-api-key-here
SMS_GATEWAY_API_URL=https://api.your-sms-provider.com/send
```

**Recommended Providers**:
- [Twilio](https://www.twilio.com/docs/sms)
- [Vonage (Nexmo)](https://developer.vonage.com/messaging/sms/overview)
- [AWS SNS](https://aws.amazon.com/sns/)
- [MessageBird](https://developers.messagebird.com/api/sms-messaging/)

**Example Integration (Twilio)**:
```typescript
async sendSMS(phone: string, message: string): Promise<NotificationResult> {
  try {
    if (!phone || phone.trim() === '') {
      return {
        success: false,
        channel: 'sms',
        error: 'Invalid phone number',
      };
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: process.env.TWILIO_PHONE_NUMBER || '',
        Body: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SMS Gateway] SMS sent successfully:', data.sid);
    
    return {
      success: true,
      channel: 'sms',
    };
  } catch (error) {
    console.error('[SMS Gateway] Error sending SMS:', error);
    return {
      success: false,
      channel: 'sms',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 2. Facebook Messenger Integration

**File**: `backend/src/services/notification.service.ts`

**Class**: `MessengerService`

**Environment Variables**:
```env
MESSENGER_ACCESS_TOKEN=your-page-access-token
MESSENGER_API_URL=https://graph.facebook.com/v18.0/me/messages
```

**Setup Requirements**:
1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Messenger product to your app
3. Generate a Page Access Token
4. Set up webhook for message delivery status (optional)

**Example Integration**:
```typescript
async sendMessage(messengerLink: string, message: string): Promise<NotificationResult> {
  try {
    if (!messengerLink || messengerLink.trim() === '') {
      return {
        success: false,
        channel: 'messenger',
        error: 'Invalid messenger link',
      };
    }

    // Extract recipient ID from messenger link
    // Format: https://m.me/username or https://m.me/1234567890
    const recipientId = this.extractRecipientId(messengerLink);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: 'MESSAGE_TAG',
        tag: 'ACCOUNT_UPDATE',
      }),
    });

    if (!response.ok) {
      throw new Error(`Messenger API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Messenger] Message sent successfully:', data.message_id);
    
    return {
      success: true,
      channel: 'messenger',
    };
  } catch (error) {
    console.error('[Messenger] Error sending message:', error);
    return {
      success: false,
      channel: 'messenger',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

private extractRecipientId(messengerLink: string): string {
  // Extract ID from m.me link
  const match = messengerLink.match(/m\.me\/(.+)/);
  return match ? match[1] : messengerLink;
}
```

## Testing

### Unit Tests

Run notification service tests:
```bash
npm test -- notification.service.test.ts
```

### Integration Tests

The notification service is integrated into the application status update endpoint. Test the full flow:
```bash
npm test -- applications.routes.test.ts
```

### Manual Testing

1. Set environment to development:
```env
NODE_ENV=development
```

2. Update an application status to "Activated", "Denied", or "Voided"

3. Check console logs for notification attempts:
```
[Notification Service] Sending Activated notification to customer: John Doe
[SMS Gateway] Sending SMS to +1234567890: Hello John Doe! Your UrbanConnect Premium Plan subscription has been activated. Welcome aboard!
[SMS Gateway] SMS sent successfully (simulated)
[Notification Service] Customer notification sent via sms
```

## Production Deployment

### Pre-deployment Checklist

- [ ] SMS Gateway API credentials configured
- [ ] Messenger API credentials configured
- [ ] Environment variables set in production
- [ ] Test notifications with real phone numbers and Messenger accounts
- [ ] Set up monitoring for notification failures
- [ ] Configure rate limiting if needed
- [ ] Review message templates for compliance

### Environment Variables

Add to your production `.env` file:
```env
# SMS Gateway (e.g., Twilio)
SMS_GATEWAY_API_KEY=your-production-api-key
SMS_GATEWAY_API_URL=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
TWILIO_PHONE_NUMBER=+1234567890

# Facebook Messenger
MESSENGER_ACCESS_TOKEN=your-production-page-access-token
MESSENGER_API_URL=https://graph.facebook.com/v18.0/me/messages

# Environment
NODE_ENV=production
```

### Error Handling

The notification service is designed to be non-blocking:
- Notification failures do NOT prevent status updates from succeeding
- Errors are logged but do not throw exceptions
- Failed notifications can be retried manually if needed

### Monitoring

Consider adding monitoring for:
- Notification success/failure rates
- API response times
- Message delivery status (via webhooks)
- Cost tracking (SMS/Messenger API usage)

## Message Templates

Current message templates are defined in `sendStatusChangeNotification()`:

### Activated
- **Customer**: "Hello {name}! Your UrbanConnect {plan} subscription has been activated. Welcome aboard!"
- **Agent**: "Good news! Your referral {name} for {plan} has been activated. Commission will be processed."

### Denied
- **Customer**: "Hello {name}. Unfortunately, your application for {plan} has been denied. Reason: {reason}"
- **Agent**: "Your referral {name} for {plan} has been denied. Reason: {reason}"

### Voided
- **Customer**: "Hello {name}. Your application for {plan} has been voided. Reason: {reason}"
- **Agent**: "Your referral {name} for {plan} has been voided. Reason: {reason}"

To customize messages, edit the `sendStatusChangeNotification()` method in `notification.service.ts`.

## Troubleshooting

### Notifications not sending in development

This is expected behavior. The service simulates successful sends in development/test environments. To test with real APIs, set `NODE_ENV=production` temporarily.

### SMS not delivered

1. Check phone number format (should include country code, e.g., +1234567890)
2. Verify SMS Gateway API credentials
3. Check API rate limits
4. Review SMS provider logs

### Messenger not delivered

1. Verify recipient has interacted with your Facebook Page
2. Check Page Access Token validity
3. Ensure Messenger link format is correct
4. Review Facebook API error messages

## Future Enhancements

Potential improvements:
- [ ] Add email notifications
- [ ] Implement notification retry logic
- [ ] Add notification templates in database
- [ ] Support multiple languages
- [ ] Add notification preferences per user
- [ ] Implement delivery status tracking
- [ ] Add notification history/audit log
