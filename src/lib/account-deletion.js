export async function deleteOdysseyAccountData(database, userId) {
  if (!database) throw new Error('Database is not configured');
  if (!userId) throw new Error('User ID is required');

  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_activities WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
