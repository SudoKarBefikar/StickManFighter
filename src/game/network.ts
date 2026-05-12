import Peer, { DataConnection } from 'peerjs';
import { NetMessage } from './types';

const PEER_CONFIG = {
  debug: 0 as const,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  }
};

export type ConnectionStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';

export class NetworkManager {
  peer: Peer | null = null;
  conn: DataConnection | null = null;
  isHost = false;
  roomCode = '';
  status: ConnectionStatus = 'idle';
  latency = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onMessage: ((msg: NetMessage) => void) | null = null;
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null;
  private onLatencyUpdate: ((ms: number) => void) | null = null;

  setHandlers(
    onMsg: (msg: NetMessage) => void,
    onStatus: (status: ConnectionStatus) => void,
    onLatency: (ms: number) => void
  ) {
    this.onMessage = onMsg;
    this.onStatusChange = onStatus;
    this.onLatencyUpdate = onLatency;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.onStatusChange?.(s);
  }

  private genRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.roomCode = this.genRoomCode();
      const peerId = `stickfight-${this.roomCode}`;
      this.setStatus('connecting');

      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', () => {
        this.setStatus('waiting');
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.conn = conn;
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Room code collision, try again
          this.peer?.destroy();
          this.roomCode = this.genRoomCode();
          const newPeerId = `stickfight-${this.roomCode}`;
          this.peer = new Peer(newPeerId, PEER_CONFIG);
          this.peer.on('open', () => { this.setStatus('waiting'); resolve(this.roomCode); });
          this.peer.on('connection', (c) => { this.conn = c; this.setupConnection(c); });
          this.peer.on('error', () => { this.setStatus('error'); reject(new Error('Failed to create room')); });
        } else {
          this.setStatus('error');
          reject(err);
        }
      });
    });
  }

  joinRoom(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomCode = code.toUpperCase();
      const peerId = `stickfight-${this.roomCode}-guest-${Math.random().toString(36).slice(2,6)}`;
      this.setStatus('connecting');

      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', () => {
        const conn = this.peer!.connect(`stickfight-${this.roomCode}`, { reliable: true });
        this.conn = conn;
        this.setupConnection(conn);
        // Resolve after connection opens (handled in setupConnection)
        conn.on('open', () => resolve());
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        this.setStatus('error');
        reject(err);
      });

      setTimeout(() => {
        if (this.status !== 'connected') {
          this.setStatus('error');
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.setStatus('connected');
      this.startPing();
    });

    conn.on('data', (data) => {
      const msg = data as NetMessage;
      if (msg.type === 'ping') {
        this.send({ type: 'pong', t: msg.t });
        return;
      }
      if (msg.type === 'pong') {
        this.latency = Math.round((Date.now() - msg.t) / 2);
        this.onLatencyUpdate?.(this.latency);
        return;
      }
      this.onMessage?.(msg);
    });

    conn.on('close', () => {
      this.setStatus('idle');
      this.stopPing();
    });

    conn.on('error', () => {
      this.setStatus('error');
    });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', t: Date.now() });
    }, 2000);
  }

  private stopPing() {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
  }

  send(msg: NetMessage) {
    if (this.conn?.open) {
      this.conn.send(msg);
    }
  }

  disconnect() {
    try { this.stopPing(); } catch { /* ignore */ }
    try { this.conn?.close(); } catch { /* ignore */ }
    try { this.peer?.destroy(); } catch { /* ignore */ }
    this.conn = null;
    this.peer = null;
    this.setStatus('idle');
  }
}
