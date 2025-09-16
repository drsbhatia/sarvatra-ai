import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, Key, Trash2 } from 'lucide-react';

interface UserSettingsProps {
  onBack: () => void;
}

interface UserSettingsData {
  hasApiKey: boolean;
  username: string;
}

export default function UserSettings({ onBack }: UserSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  // Get user settings
  const { data: settings, isLoading } = useQuery<UserSettingsData>({
    queryKey: ['/api/user/settings'],
    refetchOnWindowFocus: false
  });

  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: async (newApiKey: string) => {
      const response = await apiRequest('PUT', '/api/user/api-key', {
        apiKey: newApiKey
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'OpenAI API key has been updated successfully'
      });
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update API key',
        variant: 'destructive'
      });
    }
  });

  // Remove API key mutation
  const removeApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/user/api-key');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'OpenAI API key has been removed'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove API key',
        variant: 'destructive'
      });
    }
  });

  const handleUpdateApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive'
      });
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast({
        title: 'Validation Error',
        description: 'OpenAI API keys must start with "sk-"',
        variant: 'destructive'
      });
      return;
    }

    updateApiKeyMutation.mutate(apiKey);
  };

  const handleRemoveApiKey = () => {
    if (confirm('Are you sure you want to remove your OpenAI API key? You will not be able to use AI features without it.')) {
      removeApiKeyMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspace
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">User Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and API configurations
            </p>
          </div>

          <Card data-testid="card-api-key-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                OpenAI API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your personal OpenAI API key is required to use AI features. 
                  Your key is encrypted and stored securely.
                </p>
                
                {settings?.hasApiKey ? (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      ✓ API key is configured and ready to use
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      ⚠ No API key configured. You need to set up your OpenAI API key to use AI features.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    {settings?.hasApiKey ? 'Update API Key' : 'Enter API Key'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="pr-10"
                      data-testid="input-api-key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                      data-testid="button-toggle-api-key-visibility"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{' '}
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateApiKey}
                    disabled={updateApiKeyMutation.isPending || !apiKey.trim()}
                    data-testid="button-save-api-key"
                  >
                    {updateApiKeyMutation.isPending ? 'Saving...' : 
                     settings?.hasApiKey ? 'Update Key' : 'Save Key'}
                  </Button>
                  
                  {settings?.hasApiKey && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveApiKey}
                      disabled={removeApiKeyMutation.isPending}
                      data-testid="button-remove-api-key"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {removeApiKeyMutation.isPending ? 'Removing...' : 'Remove Key'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-account-info">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Username</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-username">
                    {settings?.username}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}