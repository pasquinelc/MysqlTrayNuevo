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

const configSchema = insertBackupConfigSchema.extend({
  databases: z.string().transform(s => s.split(',').map(d => d.trim())),
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
      schedule: "0 0 * * *",
      enabled: true,
      retention: 30
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof configSchema>) => {
      await apiRequest('POST', '/api/configs', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configs'] });
      toast({
        title: "Backup configuration created",
        description: "Your backup configuration has been saved."
      });
      form.reset();
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: async (configId: number) => {
      await apiRequest('POST', `/api/backup/${configId}/run`);
    },
    onSuccess: () => {
      toast({
        title: "Backup started",
        description: "The backup process has been initiated."
      });
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <section>
          <h2 className="text-3xl font-bold mb-4">Backup Configurations</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{config.name}</CardTitle>
                      <CardDescription>{config.databases.join(', ')}</CardDescription>
                    </div>
                    <Switch checked={config.enabled} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className="font-medium">Host:</span> {config.host}:{config.port}
                    </div>
                    <div>
                      <span className="font-medium">Schedule:</span> {config.schedule}
                    </div>
                    <div>
                      <span className="font-medium">Retention:</span> {config.retention} days
                    </div>
                  </div>
                  <Button 
                    onClick={() => runBackupMutation.mutate(config.id)}
                    disabled={runBackupMutation.isPending}
                  >
                    Run Now
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
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                    name="retention"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retention Period (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
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