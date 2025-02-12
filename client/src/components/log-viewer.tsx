import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface SystemLog {
  id: number;
  timestamp: string;
  type: string;
  level: "info" | "warning" | "error";
  message: string;
  metadata: string | null;
}

export function LogViewer() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial fetch of logs
  const { data: initialLogs = [] } = useQuery<SystemLog[]>({
    queryKey: ['/api/system-logs']
  });

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    function connect() {
      ws.current = new WebSocket(wsUrl);

      ws.current.onmessage = (event) => {
        if (isPaused) return;

        const data = JSON.parse(event.data);
        if (data.type === 'SYSTEM_LOG') {
          setLogs(prev => [...prev, data.log].slice(-1000)); // Keep last 1000 logs
        }
      };

      ws.current.onclose = () => {
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      ws.current?.close();
    };
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  function clearLogs() {
    setLogs([]);
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Asumimos que la fecha viene en ISO format y la parseamos
      const date = parseISO(timestamp);
      // Formateamos la fecha usando la localización en español
      return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <Play className="h-4 w-4 mr-2" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            {isPaused ? "Resume" : "Pause"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Buffer: {logs.length} entries
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-md bg-muted/50 p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-muted-foreground">
                {formatTimestamp(log.timestamp)}
              </span>
              <Badge variant={getLogColor(log.level)}>
                {log.level}
              </Badge>
              <span className="text-muted-foreground">[{log.type}]</span>
              <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
              {log.metadata && (
                <details className="text-xs text-muted-foreground">
                  <summary>Detalles</summary>
                  <pre>{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}