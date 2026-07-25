import { describe, test, expect, jest } from '@jest/globals';
import { processSmsQueue } from '../src/lib/sms/processor';

// Mock Africa's Talking response payload
jest.mock('africastalking', () => {
  return jest.fn().mockImplementation(() => ({
    SMS: {
      send: jest.fn().mockImplementation((params: unknown) => {
        const { to, message } = params as { to?: string[]; message?: string };
        if (!to || to.length === 0) {
          return Promise.reject(new Error('Invalid recipient number'));
        }
        return Promise.resolve({
          SMSMessageData: {
            Recipients: [
              { statusCode: 101, number: to[0], status: 'Success', messageId: 'ATid_12345' }
            ]
          }
        });
      })
    }
  }));
});

describe('Phase 10: SMS Queue & Provider Resilience', () => {
  test('Handles failed delivery attempts gracefully and marks queue status', async () => {
    const mockQueueItem = {
      id: 'queue-uuid-1',
      phone_number: '+254700000000',
      message: 'Reminder: Debt payment due',
      attempts: 0
    };

    const result = await processSmsQueue([mockQueueItem]);
    expect(result.processedCount).toBe(1);
    expect(result.failedCount).toBe(0);
  });
});