import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Bot, Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, setStoredToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginScreenProps {
  onLogin: (role: 'admin' | 'user', user: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'admin' | 'user'>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log(`Login successful:`, data.user);
      
      // Store JWT token for authenticated requests
      if (data.token) {
        setStoredToken(data.token);
      }
      
      onLogin(data.user.role, data.user);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.user.username}!`
      });
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
    }
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`${loginType} login attempted:`, { username, password });
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* App Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Sarvatra AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Point-of-Service AI Desktop Application
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="flex justify-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <Mic className="w-3 h-3" />
            Speech-to-Text
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Bot className="w-3 h-3" />
            AI Commands
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Shield className="w-3 h-3" />
            Secure
          </Badge>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={loginType === 'user' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginType('user')}
                className="flex-1"
                data-testid="button-user-login"
              >
                User Login
              </Button>
              <Button
                type="button"
                variant={loginType === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginType('admin')}
                className="flex-1"
                data-testid="button-admin-login"
              >
                Admin Login
              </Button>
            </div>
            <div>
              <CardTitle>
                {loginType === 'admin' ? 'Administrator Access' : 'User Login'}
              </CardTitle>
              <CardDescription>
                {loginType === 'admin'
                  ? 'Access command configuration and user management'
                  : 'Access AI text processing and speech-to-text features'
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  data-testid="input-username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login-submit"
              >
                {loginMutation.isPending ? 'Signing in...' : `Sign in as ${loginType === 'admin' ? 'Administrator' : 'User'}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Registration Link for Users */}
        {loginType === 'user' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Button
                variant="ghost"
                className="p-0 h-auto text-sm"
                onClick={() => console.log('Register clicked')}
                data-testid="link-register"
              >
                Request Access
              </Button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}