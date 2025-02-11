import { WebSocket } from 'ws';

let clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on('close', () => {
    clients.delete(ws);
  });
}

export function broadcast(data: any) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
