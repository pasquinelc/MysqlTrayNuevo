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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertSettingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { DiskSpace } from "@/components/disk-space";
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
        title: "Settings updated",
        description: "Your settings have been saved successfully."
      });
    }
  });

  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>) || {};

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email settings for backup notifications
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
                        <FormLabel>Notification Email Addresses</FormLabel>
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
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={settingsMap['smtp_host'] || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              updateMutation.mutate({
                                key: 'smtp_host',
                                value: e.target.value
                              });
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            value={settingsMap['smtp_port'] || '587'}
                            onChange={(e) => {
                              field.onChange(e);
                              updateMutation.mutate({
                                key: 'smtp_port',
                                value: e.target.value
                              });
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={settingsMap['smtp_username'] || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              updateMutation.mutate({
                                key: 'smtp_username',
                                value: e.target.value
                              });
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="password"
                            value={settingsMap['smtp_password'] || ''}
                            onChange={(e) => {
                              field.onChange(e);
                              updateMutation.mutate({
                                key: 'smtp_password',
                                value: e.target.value
                              });
                            }}
                          />
                        </FormControl>
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
              <CardTitle>Storage</CardTitle>
              <CardDescription>Monitor backup storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <DiskSpace />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>View real-time system logs</CardDescription>
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
