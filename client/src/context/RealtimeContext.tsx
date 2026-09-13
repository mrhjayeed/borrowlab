import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: number;
}

type RealtimeListener = (data: any, eventType: string) => void;

interface RealtimeContextType {
  isConnected: boolean;
  lastMessage: RealtimeMessage | null;
  subscribe: (eventType: string, listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, refreshProfile } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);

  const listenersRef = useRef<Map<string, Set<RealtimeListener>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const dispatchEvent = useCallback((type: string, data: any) => {
    setLastMessage({ type, data, timestamp: Date.now() });

    // Invalidate auth profile automatically on financial or status change
    if (['WALLET_UPDATED', 'RENTAL_UPDATED', 'DISPUTE_RESOLVED'].includes(type)) {
      refreshProfile().catch(() => {});
    }

    // Call exact event listeners
    const listeners = listenersRef.current.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data, type);
        } catch (err) {
          console.error(`[Realtime] Listener error on ${type}:`, err);
        }
      });
    }

    // Call wildcard '*' listeners
    const wildcardListeners = listenersRef.current.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(data, type);
        } catch (err) {
          console.error(`[Realtime] Wildcard listener error on ${type}:`, err);
        }
      });
    }
  }, [refreshProfile]);

  const subscribe = useCallback((eventType: string, listener: RealtimeListener) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(listener);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isCancelled) {
          setIsConnected(true);
        }
      };

      es.onerror = () => {
        if (!isCancelled) {
          setIsConnected(false);
          es.close();
          eventSourceRef.current = null;
          // Exponential / delayed reconnection retry
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isCancelled) connect();
          }, 3000);
        }
      };

      // Server handshake
      es.addEventListener('CONNECTED', (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(e.data);
          setIsConnected(true);
          dispatchEvent('CONNECTED', data);
        } catch {}
      });

      // Domain Realtime Events
      const monitoredEvents = [
        'RENTAL_UPDATED',
        'RENTAL_MESSAGE',
        'DISPUTE_UPDATED',
        'DISPUTE_MESSAGE',
        'DISPUTE_RESOLVED',
        'WALLET_UPDATED',
        'NOTIFICATION',
        'NOTIFICATION_READ',
        'INVENTORY_UPDATED',
        'LISTING_UPDATED',
        'WAITLIST_UPDATED',
      ];

      monitoredEvents.forEach((eventType) => {
        es.addEventListener(eventType, (e: MessageEvent) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(e.data);
            dispatchEvent(eventType, data);
          } catch (err) {
            console.error(`[Realtime] Failed to parse payload for ${eventType}:`, err);
          }
        });
      });
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [token, dispatchEvent]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastMessage, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

/**
 * Hook to subscribe to one or multiple realtime events.
 * Automatically cleans up on unmount or dependency change.
 */
export const useRealtimeEvent = (
  events: string | string[],
  callback: (data: any, eventType: string) => void
) => {
  const { subscribe } = useRealtime();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const eventList = Array.isArray(events) ? events : [events];
    const unsubs = eventList.map((evt) =>
      subscribe(evt, (data, eventType) => {
        callbackRef.current(data, eventType);
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [events, subscribe]);
};
