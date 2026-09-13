import { pool, query } from '../config/db.js';
import { realtime } from '../services/realtime.js';

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

    const res = await runQuery(
      `INSERT INTO audit_logs (
        actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
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

    const inserted = res.rows?.[0];
    if (inserted) {
      let actorName = 'System Daemon';
      let actorEmail = '';
      let actorRoles: string[] = [];

      if (actorUserId) {
        try {
          const userRes = await query(
            `SELECT u.full_name, u.university_email,
              COALESCE(
                (SELECT json_agg(r.role_name) FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = u.user_id),
                '[]'
              ) AS roles
             FROM users u WHERE u.user_id = $1`,
            [actorUserId]
          );
          if (userRes.rows.length > 0) {
            actorName = userRes.rows[0].full_name;
            actorEmail = userRes.rows[0].university_email;
            actorRoles = userRes.rows[0].roles || [];
          }
        } catch {}
      }

      realtime.broadcast('AUDIT_LOG_ENTRY', {
        ...inserted,
        actor_name: actorName,
        actor_email: actorEmail,
        actor_roles: actorRoles,
      });
    }
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
};
