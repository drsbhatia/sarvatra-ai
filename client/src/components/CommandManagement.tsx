import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Wand2, 
  Search, 
  Eye, 
  EyeOff, 
  Bot, 
  FileText, 
  Edit3, 
  CheckCircle2,
  Settings2
} from 'lucide-react';

interface CommandManagementProps {
  onBack: () => void;
}

interface CommandWithPreference {
  id: string;
  name: string;
  prompt: string;
  temperature: string;
  outputType: string;
  isActive: boolean;
  publishedToUsers: boolean;
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
  isNew: boolean;
  userPreferenceId?: string;
}

interface CommandsWithPreferencesData {
  commands: CommandWithPreference[];
}

// Icon mapping for commands
const getCommandIcon = (name: string) => {
  if (name.toLowerCase().includes('summarize')) return FileText;
  if (name.toLowerCase().includes('writing') || name.toLowerCase().includes('improve')) return Edit3;
  if (name.toLowerCase().includes('medical')) return CheckCircle2;
  return Bot;
};

export default function CommandManagement({ onBack }: CommandManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisible, setFilterVisible] = useState<'all' | 'visible' | 'hidden'>('all');
  const { toast } = useToast();

  // Get commands with user preferences
  const { data: commandsData, isLoading } = useQuery<CommandsWithPreferencesData>({
    queryKey: ['/api/user/commands-with-preferences'],
    refetchOnWindowFocus: false
  });

  const commands = commandsData?.commands || [];

  // Update command preference mutation
  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ commandId, isVisible, hasSeenNewBadge }: { 
      commandId: string; 
      isVisible: boolean; 
      hasSeenNewBadge?: boolean;
    }) => {
      const response = await apiRequest('PUT', '/api/user/command-preferences', {
        commandId,
        isVisible,
        hasSeenNewBadge
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/commands-with-preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update command preference',
        variant: 'destructive'
      });
    }
  });

  // Mark command as seen (remove NEW badge)
  const markAsSeenMutation = useMutation({
    mutationFn: async (commandId: string) => {
      const response = await apiRequest('PUT', '/api/user/command-preferences', {
        commandId,
        hasSeenNewBadge: true
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/commands-with-preferences'] });
    }
  });

  const handleVisibilityToggle = (command: CommandWithPreference) => {
    const newVisibility = !command.isVisible;
    updatePreferenceMutation.mutate({
      commandId: command.id,
      isVisible: newVisibility,
      hasSeenNewBadge: command.isNew ? true : undefined
    });
  };

  const handleMarkAsSeen = (commandId: string) => {
    markAsSeenMutation.mutate(commandId);
  };

  const handleShowAllVisible = () => {
    commands
      .filter(cmd => !cmd.isVisible)
      .forEach(cmd => {
        updatePreferenceMutation.mutate({
          commandId: cmd.id,
          isVisible: true,
          hasSeenNewBadge: cmd.isNew ? true : undefined
        });
      });
  };

  const handleHideAllVisible = () => {
    commands
      .filter(cmd => cmd.isVisible)
      .forEach(cmd => {
        updatePreferenceMutation.mutate({
          commandId: cmd.id,
          isVisible: false,
          hasSeenNewBadge: cmd.isNew ? true : undefined
        });
      });
  };

  // Filter commands based on search and visibility
  const filteredCommands = commands.filter(command => {
    const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         command.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterVisible === 'visible') return command.isVisible;
    if (filterVisible === 'hidden') return !command.isVisible;
    return true;
  });

  const visibleCount = commands.filter(cmd => cmd.isVisible).length;
  const hiddenCount = commands.filter(cmd => !cmd.isVisible).length;
  const newCount = commands.filter(cmd => cmd.isNew).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
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
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Settings2 className="w-6 h-6" />
              Command Management
            </h1>
            <p className="text-muted-foreground">
              Manage which AI commands are visible in your workspace
            </p>
          </div>

          {/* Stats and Controls */}
          <Card data-testid="card-command-stats">
            <CardHeader>
              <CardTitle>Command Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{commands.length}</div>
                  <div className="text-sm text-muted-foreground">Total Commands</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{visibleCount}</div>
                  <div className="text-sm text-muted-foreground">Visible</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{hiddenCount}</div>
                  <div className="text-sm text-muted-foreground">Hidden</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{newCount}</div>
                  <div className="text-sm text-muted-foreground">New</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowAllVisible}
                  disabled={updatePreferenceMutation.isPending || hiddenCount === 0}
                  data-testid="button-show-all"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHideAllVisible}
                  disabled={updatePreferenceMutation.isPending || visibleCount === 0}
                  data-testid="button-hide-all"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <Card data-testid="card-search-filter">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search commands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterVisible === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterVisible('all')}
                    data-testid="button-filter-all"
                  >
                    All ({commands.length})
                  </Button>
                  <Button
                    variant={filterVisible === 'visible' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterVisible('visible')}
                    data-testid="button-filter-visible"
                  >
                    Visible ({visibleCount})
                  </Button>
                  <Button
                    variant={filterVisible === 'hidden' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterVisible('hidden')}
                    data-testid="button-filter-hidden"
                  >
                    Hidden ({hiddenCount})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commands List */}
          <div className="space-y-3">
            {filteredCommands.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Wand2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Commands Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search terms or filters.'
                      : 'There are no commands matching your current filter.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCommands.map((command) => {
                const Icon = getCommandIcon(command.name);
                return (
                  <Card key={command.id} className="transition-all hover-elevate" data-testid={`card-command-${command.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold" data-testid={`text-command-name-${command.id}`}>
                                {command.name}
                              </h3>
                              {command.isNew && (
                                <Badge 
                                  variant="destructive" 
                                  className="text-xs"
                                  data-testid={`badge-new-${command.id}`}
                                >
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {command.prompt}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Temp: {command.temperature}</span>
                              <span>Output: {command.outputType}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {command.isNew && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsSeen(command.id)}
                              disabled={markAsSeenMutation.isPending}
                              data-testid={`button-mark-seen-${command.id}`}
                            >
                              Mark as Seen
                            </Button>
                          )}
                          <div className="flex items-center gap-2">
                            <Label 
                              htmlFor={`visibility-${command.id}`} 
                              className="text-sm cursor-pointer"
                            >
                              {command.isVisible ? 'Visible' : 'Hidden'}
                            </Label>
                            <Switch
                              id={`visibility-${command.id}`}
                              checked={command.isVisible}
                              onCheckedChange={() => handleVisibilityToggle(command)}
                              disabled={updatePreferenceMutation.isPending}
                              data-testid={`switch-visibility-${command.id}`}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}