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
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { BackupLog } from "@shared/schema";
import { useState } from "react";

export function BackupHistory() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const { data: logs, isLoading } = useQuery<BackupLog[]>({
    queryKey: ['/api/logs', date?.from, date?.to],
    queryFn: async () => {
      if (!date?.from || !date?.to) return fetch('/api/logs').then(r => r.json());

      // Set the time to start of day for from date and end of day for to date
      const fromDate = new Date(date.from);
      fromDate.setHours(0, 0, 0, 0);

      const toDate = new Date(date.to);
      toDate.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: fromDate.toISOString(),
        endDate: toDate.toISOString()
      });

      return fetch(`/api/logs?${params}`).then(r => r.json());
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historial de Respaldos</h2>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd/MM/yyyy", { locale: es })} -{" "}
                      {format(date.to, "dd/MM/yyyy", { locale: es })}
                    </>
                  ) : (
                    format(date.from, "dd/MM/yyyy", { locale: es })
                  )
                ) : (
                  <span>Seleccionar fechas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {date?.from && date?.to && (
            <Button 
              variant="ghost" 
              onClick={() => setDate(undefined)}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableCaption>
          {isLoading ? (
            "Cargando registros..."
          ) : logs?.length === 0 ? (
            "No hay registros para el período seleccionado"
          ) : (
            "Historial completo de respaldos"
          )}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Base de datos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead>Hace</TableHead>
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
                {format(new Date(log.startTime), "dd/MM/yyyy HH:mm:ss", { locale: es })}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(log.startTime), { addSuffix: true, locale: es })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}