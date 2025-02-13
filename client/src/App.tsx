import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/dashboard";
import Backups from "@/pages/backups";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Navigation() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center">
        <Link href="/">
          <a className="font-bold text-xl">Turbinux MySQL Backup</a>
        </Link>
        <div className="ml-8 space-x-4">
          <Link href="/">
            <a className="text-muted-foreground hover:text-foreground">
              Dashboard
            </a>
          </Link>
          <Link href="/backups">
            <a className="text-muted-foreground hover:text-foreground">
              Backups
            </a>
          </Link>
          <Link href="/settings">
            <a className="text-muted-foreground hover:text-foreground">
              Settings
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/backups" component={Backups} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main>
          <Router />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
