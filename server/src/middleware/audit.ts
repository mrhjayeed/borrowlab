import { pool, query } from '../config/db.js';

type QueryExecutor = 
  | { query: (sql: string, params?: any[]) => Promise<any> }
  | ((sql: string, params?: any[]) => Promise<any>);

export const logAudit = async (
  dbOrExecutor: QueryExecutor | null,
  actorUserId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  oldValues: any = null,
  newValues: any = null,
  ipAddress: string = '127.0.0.1'
): Promise<void> => {
  try {
    const runQuery = typeof dbOrExecutor === 'function' 
      ? dbOrExecutor 
      : (dbOrExecutor ? dbOrExecutor.query.bind(dbOrExecutor) : query);

    await runQuery(
      `INSERT INTO audit_logs (
        actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actorUserId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
};
