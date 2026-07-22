import { describe, expect, it, vi } from 'vitest';
import { deleteOdysseyAccountData } from '@/lib/account-deletion';

describe('account data deletion', () => {
  it('deletes synced activities and preferences in one transaction', async () => {
    const query = vi.fn().mockResolvedValue({});
    const release = vi.fn();
    const database = { connect: vi.fn().mockResolvedValue({ query, release }) };

    await deleteOdysseyAccountData(database, 'google-user-1');

    expect(query.mock.calls).toEqual([
      ['BEGIN'],
      ['DELETE FROM user_activities WHERE user_id = $1', ['google-user-1']],
      ['DELETE FROM user_preferences WHERE user_id = $1', ['google-user-1']],
      ['COMMIT'],
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back and releases the connection when deletion fails', async () => {
    const error = new Error('database unavailable');
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const database = { connect: vi.fn().mockResolvedValue({ query, release }) };

    await expect(deleteOdysseyAccountData(database, 'google-user-1')).rejects.toThrow(error);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
});
