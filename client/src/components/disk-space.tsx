import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HardDrive, AlertTriangle } from "lucide-react";

export function DiskSpace() {
  const { data: diskStats } = useQuery({
    queryKey: ['/api/stats/disk'],
    refetchInterval: 60000 // Refresh every minute
  });

  if (!diskStats) {
    return null;
  }

  const usagePercent = (diskStats.used / diskStats.total) * 100;
  const isLowSpace = usagePercent > 90;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          <span className="font-medium">Backup Storage</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatBytes(diskStats.used)} / {formatBytes(diskStats.total)}
        </span>
      </div>

      <Progress value={usagePercent} className="h-2" />

      {isLowSpace && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Storage Space</AlertTitle>
          <AlertDescription>
            Your backup storage is running low. Consider cleaning up old backups or increasing storage capacity.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{formatBytes(diskStats.total)}</div>
          <div className="text-sm text-muted-foreground">Total Space</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{formatBytes(diskStats.used)}</div>
          <div className="text-sm text-muted-foreground">Used Space</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{formatBytes(diskStats.free)}</div>
          <div className="text-sm text-muted-foreground">Free Space</div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
