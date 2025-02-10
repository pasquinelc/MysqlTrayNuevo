import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { BackupLog } from "@shared/schema";

interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  totalSize: number;
  lastBackupTime?: Date;
}

export function BackupStatus() {
  const { data: stats } = useQuery<BackupStats>({
    queryKey: ['/api/stats'],
  });

  const { data: recentLogs } = useQuery<BackupLog[]>({
    queryKey: ['/api/logs'],
    select: (logs) => logs.slice(0, 5),
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Backup Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{stats?.totalBackups || 0}</span>
              <span className="text-sm text-muted-foreground">Total Backups</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-600">
                {stats?.successfulBackups || 0}
              </span>
              <span className="text-sm text-muted-foreground">Successful</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-600">
                {stats?.failedBackups || 0}
              </span>
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLogs?.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{log.database}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.startTime).toLocaleString()}
                  </p>
                </div>
                <Badge 
                  variant={log.status === 'completed' ? 'default' : 'destructive'}
                  className={log.status === 'completed' ? 'bg-green-500' : undefined}
                >
                  {log.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}