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
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertSettingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { LogViewer } from "@/components/log-viewer";

export default function SettingsPage() {
  const { data: settings } = useQuery({
    queryKey: ['/api/settings']
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertSettingSchema),
    defaultValues: {
      key: "",
      value: ""
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: { key: string; value: string }) => {
      await apiRequest('PUT', `/api/settings/${values.key}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados exitosamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar la configuración",
        description: error.message || "Hubo un error al guardar los cambios.",
        variant: "destructive"
      });
    }
  });

  const settingsMap = settings?.reduce((acc: Record<string, string>, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {}) || {};

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
              <CardDescription>
                Configura los correos electrónicos para recibir notificaciones de respaldos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correos para Notificaciones</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={settingsMap['notification_emails'] || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              updateMutation.mutate({
                                key: 'notification_emails',
                                value: e.target.value
                              });
                            }}
                            placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                          />
                        </FormControl>
                        <FormDescription>
                          Ingresa las direcciones de correo separadas por comas
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Registros del Sistema</CardTitle>
              <CardDescription>Monitorea la actividad del sistema y las notificaciones por correo</CardDescription>
            </CardHeader>
            <CardContent>
              <LogViewer />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}