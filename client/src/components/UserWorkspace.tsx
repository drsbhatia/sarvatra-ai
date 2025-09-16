import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Mic, 
  MicOff, 
  Bot, 
  Play, 
  Square, 
  Settings, 
  LogOut, 
  User,
  Wand2,
  FileText,
  Edit3,
  CheckCircle2,
  Settings2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface UserWorkspaceProps {
  onLogout: () => void;
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

export default function UserWorkspace({ onLogout }: UserWorkspaceProps) {
  const [, setLocation] = useLocation();
  const [selectedText, setSelectedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('audio/webm');
  const { toast } = useToast();
  
  // Fetch user's visible AI commands with preferences
  const { data: commandsData, isLoading: commandsLoading } = useQuery<CommandsWithPreferencesData>({
    queryKey: ['/api/user/commands-with-preferences'],
    refetchOnWindowFocus: false
  });
  
  // Filter to only show visible commands
  const commands = (commandsData?.commands || []).filter(cmd => cmd.isVisible);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Store the actual MIME type for later use
      recordingMimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';
      console.log('Recording with MIME type:', recordingMimeTypeRef.current);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        processRecordedAudio();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Failed',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    console.log('Stopping audio recording...');
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };
  
  const processRecordedAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast({
        title: 'Recording Error',
        description: 'No audio data was recorded.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Use the actual MIME type from recording
      const mimeType = recordingMimeTypeRef.current;
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      
      // Extract format from MIME type (e.g., 'audio/webm' -> 'webm')
      const format = mimeType.split('/')[1] || 'webm';
      console.log('Processing audio with format:', format);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          const response = await apiRequest('POST', '/api/ai/speech-to-text', {
            audioData: base64Data,
            format: format
          });
          
          const data = await response.json();
          setTranscribedText(data.transcription);
          
          toast({
            title: 'Transcription Complete',
            description: 'Speech has been converted to text successfully'
          });
        } catch (error) {
          console.error('Transcription failed:', error);
          toast({
            title: 'Transcription Failed',
            description: 'Failed to convert speech to text. Please try again.',
            variant: 'destructive'
          });
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Failed to read audio file');
        toast({
          title: 'Processing Error',
          description: 'Failed to process recorded audio.',
          variant: 'destructive'
        });
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process recorded audio.',
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };

  // AI text processing mutation
  const textProcessMutation = useMutation({
    mutationFn: async ({ text, commandId }: { text: string; commandId: string }) => {
      const response = await apiRequest('POST', '/api/ai/process-text', { text, commandId });
      return await response.json();
    },
    onSuccess: (data, { text }) => {
      const { processedText, outputType } = data;
      
      if (outputType === 'replace') {
        setSelectedText(processedText);
        setTranscribedText(''); // Clear transcribed text when replacing
      } else if (outputType === 'append') {
        const currentText = selectedText || transcribedText;
        setSelectedText(currentText + '\n\n' + processedText);
        setTranscribedText('');
      } else if (outputType === 'new_window') {
        // For new window, show in a dialog or open in new tab
        window.open('data:text/plain;charset=utf-8,' + encodeURIComponent(processedText), '_blank');
      }
      
      toast({
        title: 'Processing Complete',
        description: `Successfully processed text with ${lastCommand}`
      });
      
      setIsProcessing(false);
      setLastCommand(null);
    },
    onError: (error: any) => {
      console.error('Text processing failed:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process text',
        variant: 'destructive'
      });
      setIsProcessing(false);
      setLastCommand(null);
    }
  });
  
  const executeCommand = (command: any) => {
    const textToProcess = selectedText || transcribedText;
    if (!textToProcess.trim()) {
      toast({
        title: 'No Text Selected',
        description: 'Please select some text or record audio first',
        variant: 'destructive'
      });
      return;
    }
    
    console.log(`Executing command: ${command.name} on text:`, textToProcess);
    setIsProcessing(true);
    setLastCommand(command.name);
    
    textProcessMutation.mutate({
      text: textToProcess,
      commandId: command.id
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Sarvatra AI</h1>
              <p className="text-xs text-muted-foreground">User Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation('/settings')} data-testid="menu-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/commands')} data-testid="menu-commands">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Manage Commands
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Text Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Text Processing
              </CardTitle>
              <CardDescription>
                Select text below and use AI commands to process it, or record audio for transcription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                ref={textareaRef}
                value={selectedText || transcribedText}
                onChange={(e) => setSelectedText(e.target.value)}
                placeholder="Type or paste text here, or use the recording feature to transcribe speech..."
                className="min-h-[200px] resize-none"
                data-testid="textarea-main"
              />
              
              {/* Recording Controls */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
                >
                  {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-mono" data-testid="text-recording-time">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}
                
                {isProcessing && (
                  <Badge variant="secondary" className="gap-1">
                    <Bot className="w-3 h-3 animate-spin" />
                    {lastCommand ? `Processing: ${lastCommand}` : 'Transcribing...'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* AI Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                AI Commands
              </CardTitle>
              <CardDescription>
                Select text above and choose a command to process it with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commands.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <Wand2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Commands Available</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't enabled any AI commands yet. Visit Command Management to enable commands.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setLocation('/commands')}
                        data-testid="button-go-to-commands"
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Manage Commands
                      </Button>
                    </div>
                  ) : (
                    commands.map((command: CommandWithPreference) => {
                      const Icon = getCommandIcon(command.name);
                      return (
                        <Button
                          key={command.id}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start text-left hover-elevate relative"
                          onClick={() => executeCommand(command)}
                          disabled={isProcessing}
                          data-testid={`button-command-${command.name.toLowerCase().replace(' ', '-')}`}
                        >
                          {command.isNew && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5"
                              data-testid={`badge-new-${command.id}`}
                            >
                              NEW
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 w-full">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="font-medium">{command.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {command.prompt.substring(0, 50)}...
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            {command.outputType.replace('_', ' ')}
                          </Badge>
                        </Button>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}