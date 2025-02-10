import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { BackupLog } from "@shared/schema";

export function BackupHistory() {
  const { data: logs } = useQuery<BackupLog[]>({
    queryKey: ['/api/logs'],
  });

  return (
    <Table>
      <TableCaption>Complete backup history</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Database</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Started</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs?.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="font-medium">{log.database}</TableCell>
            <TableCell>
              <Badge 
                variant={log.status === 'completed' ? 'default' : 'destructive'}
                className={log.status === 'completed' ? 'bg-green-500' : undefined}
              >
                {log.status}
              </Badge>
            </TableCell>
            <TableCell>
              {log.fileSize ? `${(log.fileSize / (1024 * 1024)).toFixed(2)} MB` : '-'}
            </TableCell>
            <TableCell>
              {log.endTime && log.startTime
                ? `${Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000)}s`
                : '-'}
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(log.startTime), { addSuffix: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}