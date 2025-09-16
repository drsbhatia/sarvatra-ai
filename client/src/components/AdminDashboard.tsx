import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  Shield, 
  Users, 
  Bot, 
  Settings, 
  LogOut, 
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  UserPlus,
  FileText,
  Activity,
  UserCheck,
  UserX
} from "lucide-react";
import { useForm } from "react-hook-form";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, logout } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { insertUserSchema, insertCommandSchema, strongPasswordSchema, type InsertUser, type User, type Command, type InsertCommand } from "@shared/schema";

interface AdminDashboardProps {
  onLogout: () => void;
}

// Use shared schema for consistency with backend
type CreateUserForm = InsertUser;



export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('users');
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [newCommand, setNewCommand] = useState<{
    name: string;
    prompt: string;
    temperature: string;
    outputType: 'replace' | 'append' | 'new_window';
    publishedToUsers: boolean;
  }>({
    name: '',
    prompt: '',
    temperature: '0.3',
    outputType: 'replace',
    publishedToUsers: false
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch users data
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users']
    // Using default queryFn that includes auth headers automatically
  });

  // Fetch commands data
  const { data: commandsData, isLoading: commandsLoading, error: commandsError } = useQuery({
    queryKey: ['/api/admin/commands']
    // Using default queryFn that includes auth headers automatically
  });

  // Fetch statistics data
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/admin/stats']
    // Using default queryFn that includes auth headers automatically
  });
  
  const users = (usersData as any)?.users || [];
  const commands = (commandsData as any)?.commands || [];
  const statistics = (statsData as any)?.stats || {
    totalUsers: 0,
    totalCommands: 0,
    activeUsers: 0,
    pendingUsers: 0,
    publishedCommands: 0,
    usageToday: 0
  };
  
  // User creation form
  const userForm = useForm<CreateUserForm>({
    resolver: zodResolver(insertUserSchema.extend({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: strongPasswordSchema
    })),
    defaultValues: {
      username: '',
      password: '',
      role: 'user'
    }
  });

  // Edit user form (password is optional for updates)
  const editUserForm = useForm<Partial<CreateUserForm>>({
    resolver: zodResolver(insertUserSchema.extend({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: strongPasswordSchema.optional()
    }).partial()),
    defaultValues: {
      username: '',
      password: '',
      role: 'user'
    }
  });

  // User status update mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}/status`, { status });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'User Status Updated',
        description: `User ${data.user.username} has been ${variables.status}`
      });
      // Refresh user list to show updated status
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update User Status',
        description: error.message || 'An error occurred while updating the user status',
        variant: 'destructive'
      });
    }
  });

  const handleUserAction = (userId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    updateUserStatusMutation.mutate({ userId, status });
  };

  // Command creation/update mutation
  const commandMutation = useMutation({
    mutationFn: async (commandData: typeof newCommand) => {
      const method = editingCommand ? 'PUT' : 'POST';
      const url = editingCommand ? `/api/admin/commands/${editingCommand.id}` : '/api/admin/commands';
      const response = await apiRequest(method, url, commandData);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      const actionType = editingCommand ? 'updated' : 'created';
      const publishStatus = data.command.publishedToUsers ? ' and published to users' : ' as private';
      toast({
        title: editingCommand ? 'Command Updated' : 'Command Created',
        description: `AI command "${data.command.name}" has been ${actionType}${publishStatus}`
      });
      setShowCommandDialog(false);
      setEditingCommand(null);
      setNewCommand({ name: '', prompt: '', temperature: '0.3', outputType: 'replace', publishedToUsers: false });
      // Refresh commands list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/commands'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Save Command',
        description: error.message || 'An error occurred while saving the command',
        variant: 'destructive'
      });
    }
  });

  // Command publish toggle mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ commandId, publishedToUsers }: { commandId: string; publishedToUsers: boolean }) => {
      const response = await apiRequest('PUT', `/api/admin/commands/${commandId}`, { publishedToUsers });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Command Updated',
        description: `Command "${data.command.name}" ${data.command.publishedToUsers ? 'published to users' : 'made private'}`
      });
      // Refresh commands list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/commands'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Command',
        description: error.message || 'An error occurred while updating the command',
        variant: 'destructive'
      });
    }
  });

  const handleCommandSave = (publish: boolean = false) => {
    commandMutation.mutate({ ...newCommand, publishedToUsers: publish });
  };

  const handleTogglePublish = (commandId: string, currentStatus: boolean) => {
    togglePublishMutation.mutate({ commandId, publishedToUsers: !currentStatus });
  };
  
  // User creation mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest('POST', '/api/admin/create-user', userData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Created Successfully',
        description: `User ${data.user.username} has been created with ${data.user.role} role`
      });
      setShowAddUserDialog(false);
      userForm.reset();
      // Refresh user list to show new user
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create User',
        description: error.message || 'An error occurred while creating the user',
        variant: 'destructive'
      });
    }
  });
  
  const onCreateUser = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { userId: string; updates: Partial<CreateUserForm> }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userData.userId}`, userData.updates);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Updated Successfully',
        description: `User ${data.user.username} has been updated`
      });
      setShowEditUserDialog(false);
      editUserForm.reset();
      setEditingUser(null);
      // Refresh user list to show updated user
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update User',
        description: error.message || 'An error occurred while updating the user',
        variant: 'destructive'
      });
    }
  });

  const onUpdateUser = (data: Partial<CreateUserForm>) => {
    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, updates: data });
    }
  };

  // Populate edit form when editingUser changes
  React.useEffect(() => {
    if (editingUser) {
      editUserForm.reset({
        username: editingUser.username,
        role: editingUser.role,
        password: '' // Leave password empty for updates
      });
    }
  }, [editingUser, editUserForm]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Sarvatra AI</h1>
              <p className="text-xs text-muted-foreground">Administrator Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-admin-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback><Shield className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="menu-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <main className="flex-1 p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-2xl font-bold text-muted-foreground">--</div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="stat-total-users">{statistics.totalUsers}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {statistics.pendingUsers > 0 && `${statistics.pendingUsers} pending approval`}
                  {statistics.pendingUsers === 0 && 'All users approved'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Commands</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-2xl font-bold text-muted-foreground">--</div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="stat-total-commands">{statistics.totalCommands}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {statistics.publishedCommands} published to users
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usage Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-2xl font-bold text-muted-foreground">--</div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="stat-usage-today">{statistics.usageToday}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Commands processed today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
              <TabsTrigger value="commands" data-testid="tab-commands">AI Commands</TabsTrigger>
            </TabsList>
            
            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle>User Accounts</CardTitle>
                    <CardDescription className="mt-1">
                      Manage user registrations and access permissions
                    </CardDescription>
                  </div>
                  <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-user">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account with specified role and permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...userForm}>
                        <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
                          <FormField
                            control={userForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter username" 
                                    {...field} 
                                    data-testid="input-new-username"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Enter password" 
                                    {...field} 
                                    data-testid="input-new-password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-new-role">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowAddUserDialog(false)}
                              data-testid="button-cancel-user"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createUserMutation.isPending}
                              data-testid="button-create-user"
                            >
                              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Edit User Dialog */}
                  <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                          Update user account details. Leave password empty to keep current password.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...editUserForm}>
                        <form onSubmit={editUserForm.handleSubmit(onUpdateUser)} className="space-y-4">
                          <FormField
                            control={editUserForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter username" 
                                    {...field} 
                                    data-testid="input-edit-username"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password (optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Enter new password or leave empty" 
                                    {...field} 
                                    data-testid="input-edit-password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-role">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setShowEditUserDialog(false);
                                setEditingUser(null);
                              }}
                              data-testid="button-cancel-edit-user"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={updateUserMutation.isPending}
                              data-testid="button-update-user"
                            >
                              {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              Loading users...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : usersError ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-destructive">
                            Error loading users: {usersError.message}
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src="" />
                                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.username}</div>
                                  <div className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.status === 'approved' ? 'default' : user.status === 'rejected' ? 'destructive' : 'secondary'}
                                data-testid={`status-${user.id}`}
                                className="capitalize"
                              >
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.lastLoginAt 
                                ? new Date(user.lastLoginAt).toLocaleDateString()
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {user.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUserAction(user.id, 'approve')}
                                      disabled={updateUserStatusMutation.isPending}
                                      data-testid={`button-approve-${user.id}`}
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      {updateUserStatusMutation.isPending ? 'Approving...' : 'Approve'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleUserAction(user.id, 'reject')}
                                      disabled={updateUserStatusMutation.isPending}
                                      data-testid={`button-reject-${user.id}`}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      {updateUserStatusMutation.isPending ? 'Rejecting...' : 'Reject'}
                                    </Button>
                                  </>
                                )}
                                {user.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setShowEditUserDialog(true);
                                    }}
                                    data-testid={`button-manage-${user.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Commands Management Tab */}
            <TabsContent value="commands" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>AI Commands</CardTitle>
                    <CardDescription>
                      Configure AI commands available to users
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowCommandDialog(true)}
                    data-testid="button-add-command"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Command
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {commandsLoading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading commands...
                      </div>
                    ) : commandsError ? (
                      <div className="text-center py-4 text-red-600">
                        Error loading commands
                      </div>
                    ) : commands.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No AI commands configured yet
                      </div>
                    ) : commands.map((command: Command) => (
                      <Card key={command.id} className="hover-elevate">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{command.name}</CardTitle>
                              <Badge 
                                variant={command.publishedToUsers ? "default" : "secondary"}
                                data-testid={`badge-status-${command.id}`}
                              >
                                {command.publishedToUsers ? 'Published' : 'Private'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Temp: {command.temperature}
                              </Badge>
                              <Badge variant="secondary">
                                {command.outputType.replace('_', ' ')}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePublish(command.id, command.publishedToUsers)}
                                disabled={togglePublishMutation.isPending}
                                data-testid={`button-toggle-publish-${command.id}`}
                              >
                                {command.publishedToUsers ? 'Make Private' : 'Publish'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCommand(command);
                                  setNewCommand({
                                    name: command.name,
                                    prompt: command.prompt,
                                    temperature: command.temperature.toString(),
                                    outputType: command.outputType as 'replace' | 'append' | 'new_window',
                                    publishedToUsers: command.publishedToUsers
                                  });
                                  setShowCommandDialog(true);
                                }}
                                data-testid={`button-edit-command-${command.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-2">
                            {command.prompt}
                          </p>
                          {/* Future attachment support */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Command Dialog */}
      <Dialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCommand ? 'Edit Command' : 'Create New Command'}
            </DialogTitle>
            <DialogDescription>
              Configure the AI command settings and prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="command-name">Command Name</Label>
              <Input
                id="command-name"
                value={newCommand.name}
                onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter command name"
                data-testid="input-command-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command-prompt">Prompt</Label>
              <Textarea
                id="command-prompt"
                value={newCommand.prompt}
                onChange={(e) => setNewCommand(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Enter the AI prompt for this command"
                className="min-h-[100px]"
                data-testid="textarea-command-prompt"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={newCommand.temperature}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, temperature: e.target.value }))}
                  data-testid="input-temperature"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="output-type">Output Type</Label>
                <Select
                  value={newCommand.outputType}
                  onValueChange={(value: 'replace' | 'append' | 'new_window') => 
                    setNewCommand(prev => ({ ...prev, outputType: value }))
                  }
                >
                  <SelectTrigger data-testid="select-output-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">Replace Text</SelectItem>
                    <SelectItem value="append">Append to Text</SelectItem>
                    <SelectItem value="new_window">New Window</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Save creates a private command only visible to admins.
                Publish makes it available to all users.
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCommandDialog(false)}
                  data-testid="button-cancel-command"
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleCommandSave(false)}
                  disabled={commandMutation.isPending}
                  data-testid="button-save-command"
                >
                  {commandMutation.isPending ? 'Saving...' : (editingCommand ? 'Save Changes' : 'Save as Private')}
                </Button>
                <Button 
                  onClick={() => handleCommandSave(true)}
                  disabled={commandMutation.isPending}
                  data-testid="button-publish-command"
                >
                  {commandMutation.isPending ? 'Publishing...' : (editingCommand ? 'Save & Publish' : 'Create & Publish')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}