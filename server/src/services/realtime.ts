import { Response } from 'express';

export interface RealtimeClient {
  id: string;
  userId: number;
  res: Response;
  connectedAt: Date;
}

export type RealtimeEventType =
  | 'RENTAL_UPDATED'
  | 'RENTAL_MESSAGE'
  | 'DISPUTE_UPDATED'
  | 'DISPUTE_MESSAGE'
  | 'DISPUTE_RESOLVED'
  | 'WALLET_UPDATED'
  | 'NOTIFICATION'
  | 'NOTIFICATION_READ'
  | 'INVENTORY_UPDATED'
  | 'LISTING_UPDATED'
  | 'WAITLIST_UPDATED';

class RealtimeService {
  private clients: Map<string, RealtimeClient> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Keep connections alive across proxies and idle timeouts
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, 25000);
  }

  public addClient(id: string, userId: number, res: Response) {
    this.clients.set(id, {
      id,
      userId,
      res,
      connectedAt: new Date(),
    });

    // Send initial connected handshake
    this.sendEventToRes(res, 'CONNECTED', {
      clientId: id,
      userId,
      timestamp: Date.now(),
    });
  }

  public removeClient(id: string) {
    this.clients.delete(id);
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }

  public getConnectedUsers(): number[] {
    const userIds = new Set<number>();
    for (const client of this.clients.values()) {
      userIds.add(client.userId);
    }
    return Array.from(userIds);
  }

  /**
   * Broadcast an event to ALL connected clients (e.g. marketplace availability change)
   */
  public broadcast(event: RealtimeEventType | string, data: any) {
    for (const client of this.clients.values()) {
      this.sendEventToRes(client.res, event, data);
    }
  }

  /**
   * Send an event to all open sessions of a specific user
   */
  public sendToUser(userId: number | string, event: RealtimeEventType | string, data: any) {
    const targetId = Number(userId);
    for (const client of this.clients.values()) {
      if (client.userId === targetId) {
        this.sendEventToRes(client.res, event, data);
      }
    }
  }

  /**
   * Send an event to multiple users (e.g. borrower + owner + staff)
   */
  public sendToUsers(userIds: (number | string)[], event: RealtimeEventType | string, data: any) {
    const targets = new Set(userIds.map((id) => Number(id)));
    for (const client of this.clients.values()) {
      if (targets.has(client.userId)) {
        this.sendEventToRes(client.res, event, data);
      }
    }
  }

  private sendEventToRes(res: Response, event: string, data: any) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Stream write error; client cleanup handled by req close
    }
  }

  private heartbeat() {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        this.clients.delete(id);
      }
    }
  }
}

export const realtime = new RealtimeService();
