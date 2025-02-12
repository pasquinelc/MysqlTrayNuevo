import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertBackupConfigSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { BackupConfig } from "@shared/schema";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const configSchema = insertBackupConfigSchema.extend({
  databases: z.string().transform(s => s.split(',').map(d => d.trim()).filter(Boolean)),
  port: z.coerce.number().min(1).max(65535),
});

export default function BackupsPage() {
  const { data: configs = [] } = useQuery<BackupConfig[]>({
    queryKey: ['/api/configs']
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: "",
      host: "localhost",
      port: 3306,
      username: "",
      password: "",
      databases: "",
      schedule: "0 12 * * *", // Default to noon daily
      enabled: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof configSchema>) => {
      // Transform values to match backend expectations
      const formData = {
        ...values,
        databases: values.databases instanceof Array ? values.databases : values.databases.split(',').map(d => d.trim()).filter(Boolean)
      };
      await apiRequest('POST', '/api/configs', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configs'] });
      toast({
        title: "Configuración de respaldo creada",
        description: "La configuración de respaldo ha sido guardada exitosamente."
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear configuración",
        description: error.message || "Hubo un error al crear la configuración de respaldo.",
        variant: "destructive"
      });
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: async (configId: number) => {
      const response = await apiRequest('POST', `/api/backup/${configId}/run`);
      if (response && response.status === 'failed') {
        throw new Error(response.error || 'Error al ejecutar el respaldo');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Respaldo completado",
        description: "El proceso de respaldo se ha completado exitosamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en el respaldo",
        description: error.message || "Hubo un error al ejecutar el respaldo. Verifica las credenciales y la conexión a la base de datos.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: number) => {
      await apiRequest('DELETE', `/api/configs/${configId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configs'] });
      toast({
        title: "Configuración eliminada",
        description: "La configuración de respaldo ha sido eliminada exitosamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar configuración",
        description: error.message || "Hubo un error al eliminar la configuración de respaldo.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <section>
          <h2 className="text-3xl font-bold mb-4">Configuraciones de Respaldo</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{config.name}</CardTitle>
                      <CardDescription>{config.databases.join(', ')}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={config.enabled ?? false} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará la configuración
                              de respaldo "{config.name}" y se detendrán futuros respaldos programados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(config.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className="font-medium">Host:</span> {config.host}:{config.port}
                    </div>
                    <div>
                      <span className="font-medium">Programación:</span> {config.schedule}
                    </div>
                  </div>
                  <Button 
                    onClick={() => runBackupMutation.mutate(config.id)}
                    disabled={runBackupMutation.isPending}
                  >
                    {runBackupMutation.isPending ? "Ejecutando..." : "Ejecutar ahora"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Add New Backup Configuration</CardTitle>
              <CardDescription>
                Configure a new database backup schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  createMutation.mutate(data);
                })} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Configuration Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="databases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Databases</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of database names
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule (Cron Expression)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          e.g. "0 0 * * *" for daily at midnight
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Enable backup schedule</FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={createMutation.isPending}>
                    Add Configuration
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}