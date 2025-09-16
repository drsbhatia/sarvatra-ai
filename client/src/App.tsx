import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginScreen from "@/components/LoginScreen";
import UserWorkspace from "@/components/UserWorkspace";
import UserSettings from "@/components/UserSettings";
import CommandManagement from "@/components/CommandManagement";
import AdminDashboard from "@/components/AdminDashboard";
import NotFound from "@/pages/not-found";

type User = {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [location, setLocation] = useLocation();

  const handleLogin = (role: 'admin' | 'user', user: User) => {
    console.log('Login successful:', { role, username: user.username });
    setCurrentUser(user);
    setLocation('/'); // Navigate to main workspace after login
  };

  const handleLogout = () => {
    console.log('User logged out');
    setCurrentUser(null);
    setLocation('/'); // Navigate to login after logout
  };

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    if (currentUser.role === 'admin') {
      return <AdminDashboard onLogout={handleLogout} />;
    }

    return (
      <Switch>
        <Route path="/" component={() => <UserWorkspace onLogout={handleLogout} />} />
        <Route path="/settings" component={() => <UserSettings onBack={() => setLocation('/')} />} />
        <Route path="/commands" component={() => <CommandManagement onBack={() => setLocation('/')} />} />
        <Route component={NotFound} />
      </Switch>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          {renderContent()}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
