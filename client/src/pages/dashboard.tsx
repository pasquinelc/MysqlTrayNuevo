import { BackupStatus } from "@/components/backup-status";
import { BackupHistory } from "@/components/backup-history";

export default function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Backup Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your database backups and system status
        </p>
      </div>

      <div className="grid gap-8">
        <BackupStatus />
        <BackupHistory />
      </div>
    </div>
  );
}
