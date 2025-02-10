import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    function connect() {
      ws.current = new WebSocket(wsUrl);

      ws.current.onmessage = (event) => {
        if (isPaused) return;
        
        const data = JSON.parse(event.data);
        if (data.type === 'LOG') {
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

      <ScrollArea ref={scrollRef} className="h-[400px] border rounded-md bg-muted/50 p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <Badge
                variant={
                  log.level === 'error' ? 'destructive' :
                  log.level === 'warn' ? 'warning' :
                  'secondary'
                }
              >
                {log.level}
              </Badge>
              <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
