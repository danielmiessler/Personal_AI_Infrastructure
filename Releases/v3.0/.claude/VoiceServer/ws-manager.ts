/**
 * WebSocket connection manager for audio forwarding.
 *
 * Tracks connected browser clients and broadcasts MP3 audio data
 * to all of them. When no clients are connected, the server falls
 * back to local audio playback.
 */

import type { ServerWebSocket } from "bun";

type WebSocketData = {
  clientId: string;
};

/**
 * Manages WebSocket connections for audio streaming.
 */
export class ConnectionManager {
  private activeConnections: Set<ServerWebSocket<WebSocketData>> = new Set();

  /**
   * Register a new WebSocket connection.
   */
  connect(ws: ServerWebSocket<WebSocketData>): void {
    this.activeConnections.add(ws);
    console.log(
      `🔌 WebSocket client connected (ID: ${ws.data.clientId}). Total clients: ${this.activeConnections.size}`
    );
  }

  /**
   * Remove a WebSocket connection from the active list.
   */
  disconnect(ws: ServerWebSocket<WebSocketData>): void {
    this.activeConnections.delete(ws);
    console.log(
      `🔌 WebSocket client disconnected (ID: ${ws.data.clientId}). Total clients: ${this.activeConnections.size}`
    );
  }

  /**
   * Check if any WebSocket clients are connected.
   */
  hasClients(): boolean {
    return this.activeConnections.size > 0;
  }

  /**
   * Return the number of connected clients.
   */
  clientCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Send raw audio bytes to all connected clients.
   *
   * Automatically removes dead connections that raise errors.
   *
   * @param audioBytes - Raw MP3 file bytes to broadcast.
   */
  async broadcastAudio(audioBytes: ArrayBuffer): Promise<void> {
    const deadConnections: ServerWebSocket<WebSocketData>[] = [];

    for (const ws of this.activeConnections) {
      try {
        ws.send(audioBytes);
      } catch (error) {
        console.warn(`⚠️  Failed to send audio to client ${ws.data.clientId}:`, error);
        deadConnections.push(ws);
      }
    }

    // Clean up dead connections
    for (const ws of deadConnections) {
      this.activeConnections.delete(ws);
    }

    if (deadConnections.length > 0) {
      console.log(
        `🧹 Removed ${deadConnections.length} dead connection(s). Remaining: ${this.activeConnections.size}`
      );
    }
  }

  /**
   * Send a text notification to all connected clients.
   *
   * @param message - The notification message text.
   * @param title - Optional title for the notification.
   */
  async broadcastNotification(message: string, title: string = ""): Promise<void> {
    const deadConnections: ServerWebSocket<WebSocketData>[] = [];
    const payload = JSON.stringify({
      type: "notification",
      message,
      title,
    });

    for (const ws of this.activeConnections) {
      try {
        ws.send(payload);
      } catch (error) {
        console.warn(`⚠️  Failed to send notification to client ${ws.data.clientId}:`, error);
        deadConnections.push(ws);
      }
    }

    // Clean up dead connections
    for (const ws of deadConnections) {
      this.activeConnections.delete(ws);
    }
  }
}

// Singleton instance used by server
export const wsManager = new ConnectionManager();
