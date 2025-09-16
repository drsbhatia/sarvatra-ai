import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, textProcessSchema, speechProcessSchema, insertUserSchema, insertCommandSchema, updateApiKeySchema, commandPreferenceSchema, strongPasswordSchema } from "@shared/schema";
import { generateToken } from "./auth/jwt-utils";
import { authenticateToken } from "./auth/auth-middleware";
import { requireAdmin } from "./auth/admin-middleware";
import OpenAI from 'openai';
import bcrypt from 'bcrypt';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// SECURITY: Validate SESSION_SECRET is properly configured
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required for secure encryption');
}
if (process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long for secure encryption');
}

// Secure encryption utilities using AES-256-GCM with proper key derivation
function encryptApiKey(apiKey: string): string {
  try {
    // Generate a unique salt for this encryption
    const salt = randomBytes(32);
    
    // Derive encryption key using scrypt (secure key derivation function)
    const key = scryptSync(process.env.SESSION_SECRET!, salt, 32);
    
    // Generate random IV for GCM (12 bytes is standard for AES-GCM)
    const iv = randomBytes(12);
    
    // Create cipher with AES-256-GCM for authenticated encryption
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the API key
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag (ensures data integrity)
    const authTag = cipher.getAuthTag();
    
    // Return format: salt:iv:ciphertext:tag (all hex encoded)
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      encrypted,
      authTag.toString('hex')
    ].join(':');
  } catch (error) {
    console.error('API key encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

function decryptApiKey(encryptedData: string): string {
  try {
    // Parse the encrypted data format: salt:iv:ciphertext:tag
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, encryptedHex, authTagHex] = parts;
    
    // Convert hex strings back to buffers
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Derive the same key using the stored salt
    const key = scryptSync(process.env.SESSION_SECRET!, salt, 32);
    
    // Create decipher with AES-256-GCM
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    
    // Set the authentication tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('API key decryption failed:', error);
    throw new Error('Failed to decrypt API key - data may be corrupted or tampered with');
  }
}

// Secure schema for public registration (no role selection)
const publicRegistrationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: strongPasswordSchema
});

// Admin-only user creation schema (allows role selection)
const adminUserCreationSchema = insertUserSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: strongPasswordSchema,
  role: z.enum(['user', 'admin']).optional().default('user')
});

// SECURITY: Sanitize user objects to never expose sensitive fields
function sanitizeUser(user: any) {
  const { password, openaiApiKey, ...sanitizedUser } = user;
  return sanitizedUser;
}

function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ====== PUBLIC AUTHENTICATION ROUTES ======
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Use bcrypt to compare passwords securely
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (user.status !== 'approved') {
        return res.status(403).json({ 
          error: 'Account pending approval', 
          status: user.status 
        });
      }
      
      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return sanitized user (no password, no API key) with token
      const sanitizedUser = sanitizeUser(user);
      res.json({ 
        user: sanitizedUser,
        token,
        expiresIn: '24h'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });
  
  // Public registration - SECURE: Only allows user role and pending status
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = publicRegistrationSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // SECURITY: Force role='user' and status='pending' for public registration
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: 'user' // FORCED - no privilege escalation possible
      });
      
      const sanitizedUser = sanitizeUser(user);
      res.status(201).json({ 
        user: sanitizedUser,
        message: 'Account created successfully. Please wait for admin approval.'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  // ====== USER ROUTES (AUTHENTICATED) ======

  // Get published commands - authenticated users only
  app.get('/api/commands', authenticateToken, async (req, res) => {
    try {
      const commands = await storage.getPublishedCommands();
      res.json({ commands });
    } catch (error) {
      console.error('Commands fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch commands' });
    }
  });

  // AI Text Processing - authenticated users only
  app.post('/api/ai/process-text', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { text, commandId } = textProcessSchema.parse(req.body);
      
      const command = await storage.getCommand(commandId);
      if (!command || !command.isActive || !command.publishedToUsers) {
        return res.status(404).json({ error: 'Command not found or not available' });
      }
      
      // Get the user's OpenAI API key
      const user = await storage.getUser(req.user.id);
      if (!user?.openaiApiKey) {
        return res.status(400).json({ 
          error: 'OpenAI API key not configured. Please add your API key in Settings.' 
        });
      }
      
      // Decrypt the user's API key and create user-specific OpenAI client
      let userOpenAI: OpenAI;
      try {
        const decryptedApiKey = decryptApiKey(user.openaiApiKey);
        userOpenAI = new OpenAI({ apiKey: decryptedApiKey });
      } catch (decryptError) {
        console.error('Failed to decrypt user API key:', decryptError);
        return res.status(500).json({ error: 'Failed to access API key. Please re-enter your key in Settings.' });
      }
      
      const response = await userOpenAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: command.prompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: parseFloat(command.temperature),
        max_tokens: 2000
      });
      
      const processedText = response.choices[0]?.message?.content || '';
      
      res.json({ 
        processedText,
        outputType: command.outputType 
      });
    } catch (error) {
      console.error('Text processing error:', error);
      
      // Handle OpenAI API errors with more specific messages
      if (error instanceof Error && error.message.includes('Incorrect API key')) {
        return res.status(400).json({ error: 'Invalid OpenAI API key. Please check your key in Settings.' });
      }
      if (error instanceof Error && error.message.includes('quota')) {
        return res.status(400).json({ error: 'OpenAI API quota exceeded. Please check your account.' });
      }
      
      res.status(500).json({ error: 'Failed to process text' });
    }
  });
  
  // Speech-to-Text Processing - authenticated users only
  app.post('/api/ai/speech-to-text', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { audioData, format } = speechProcessSchema.parse(req.body);
      
      // Get the user's OpenAI API key
      const user = await storage.getUser(req.user.id);
      if (!user?.openaiApiKey) {
        return res.status(400).json({ 
          error: 'OpenAI API key not configured. Please add your API key in Settings.' 
        });
      }
      
      // Decrypt the user's API key and create user-specific OpenAI client
      let userOpenAI: OpenAI;
      try {
        const decryptedApiKey = decryptApiKey(user.openaiApiKey);
        userOpenAI = new OpenAI({ apiKey: decryptedApiKey });
      } catch (decryptError) {
        console.error('Failed to decrypt user API key:', decryptError);
        return res.status(500).json({ error: 'Failed to access API key. Please re-enter your key in Settings.' });
      }
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Create a blob for OpenAI (safer than File API)
      const audioBlob = new Blob([audioBuffer], { 
        type: `audio/${format}` 
      });
      
      // Add filename property to blob for OpenAI
      (audioBlob as any).name = `audio.${format}`;
      
      const response = await userOpenAI.audio.transcriptions.create({
        file: audioBlob,
        model: 'whisper-1',
        response_format: 'text'
      });
      
      res.json({ transcription: response });
    } catch (error) {
      console.error('Speech-to-text error:', error);
      
      // Handle OpenAI API errors with more specific messages
      if (error instanceof Error && error.message.includes('Incorrect API key')) {
        return res.status(400).json({ error: 'Invalid OpenAI API key. Please check your key in Settings.' });
      }
      if (error instanceof Error && error.message.includes('quota')) {
        return res.status(400).json({ error: 'OpenAI API quota exceeded. Please check your account.' });
      }
      
      res.status(500).json({ error: 'Failed to process speech' });
    }
  });

  // ====== USER SETTINGS ROUTES (AUTHENTICATED) ======
  
  // Get user settings (including OpenAI API key status)
  app.get('/api/user/settings', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        hasApiKey: !!user.openaiApiKey,
        username: user.username 
      });
    } catch (error) {
      console.error('User settings fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  });
  
  // Update OpenAI API key
  app.put('/api/user/api-key', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { apiKey } = updateApiKeySchema.parse(req.body);
      
      // Test the API key by making a simple request
      const testOpenAI = new OpenAI({ apiKey });
      try {
        await testOpenAI.models.list();
      } catch (apiError) {
        return res.status(400).json({ error: 'Invalid OpenAI API key. Please check and try again.' });
      }
      
      // Encrypt and store the API key
      const encryptedApiKey = encryptApiKey(apiKey);
      await storage.updateUser(req.user.id, { openaiApiKey: encryptedApiKey });
      
      res.json({ success: true, hasApiKey: true });
    } catch (error) {
      console.error('API key update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to update API key' });
    }
  });
  
  // Remove OpenAI API key
  app.delete('/api/user/api-key', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      await storage.updateUser(req.user.id, { openaiApiKey: null });
      res.json({ success: true, hasApiKey: false });
    } catch (error) {
      console.error('API key removal error:', error);
      res.status(500).json({ error: 'Failed to remove API key' });
    }
  });
  
  // ====== COMMAND PREFERENCES ROUTES (AUTHENTICATED) ======
  
  // Get user command preferences
  app.get('/api/user/command-preferences', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const preferences = await storage.getUserCommandPreferences(req.user.id);
      res.json({ preferences });
    } catch (error) {
      console.error('Command preferences fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch command preferences' });
    }
  });
  
  // Set/update command visibility preference
  app.put('/api/user/command-preferences', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { commandId, isVisible, hasSeenNewBadge } = commandPreferenceSchema.parse(req.body);
      
      // SECURITY: Validate that the command exists and is published to users
      const command = await storage.getCommand(commandId);
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }
      
      if (!command.publishedToUsers || !command.isActive) {
        return res.status(403).json({ error: 'Command is not available to users' });
      }
      
      // Check if preference already exists
      const existing = await storage.getUserCommandPreference(req.user.id, commandId);
      
      if (existing) {
        const updates: Partial<typeof existing> = { isVisible };
        if (hasSeenNewBadge !== undefined) {
          updates.hasSeenNewBadge = hasSeenNewBadge;
        }
        const updated = await storage.updateUserCommandPreference(req.user.id, commandId, updates);
        res.json({ preference: updated });
      } else {
        const newPreference = await storage.setUserCommandPreference({
          userId: req.user.id,
          commandId,
          isVisible,
          hasSeenNewBadge: hasSeenNewBadge ?? false
        });
        res.json({ preference: newPreference });
      }
    } catch (error) {
      console.error('Command preference update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to update command preference' });
    }
  });
  
  // Get published commands with user preferences
  app.get('/api/user/commands-with-preferences', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const publishedCommands = await storage.getPublishedCommands();
      const userPreferences = await storage.getUserCommandPreferences(req.user.id);
      
      // Create a map of preferences for quick lookup
      const preferenceMap = new Map(userPreferences.map(pref => [pref.commandId, pref]));
      
      // Combine commands with user preferences, marking new commands
      const commandsWithPreferences = publishedCommands.map(command => {
        const userPref = preferenceMap.get(command.id);
        const isNew = !userPref?.hasSeenNewBadge;
        
        return {
          ...command,
          isVisible: userPref?.isVisible ?? true, // Default to visible
          isNew,
          userPreferenceId: userPref?.id
        };
      });
      
      res.json({ commands: commandsWithPreferences });
    } catch (error) {
      console.error('Commands with preferences fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch commands with preferences' });
    }
  });

  // ====== ADMIN-ONLY ROUTES (AUTHENTICATED + ADMIN ROLE) ======

  // Get all users - admin only
  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = sanitizeUsers(users);
      res.json({ users: sanitizedUsers });
    } catch (error) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Create user - admin only (allows role selection)
  app.post('/api/admin/create-user', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userData = adminUserCreationSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      const sanitizedUser = sanitizeUser(user);
      res.status(201).json({ user: sanitizedUser });
    } catch (error) {
      console.error('Admin user creation error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });
  
  // Update user status - admin only
  app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const user = await storage.updateUser(id, { status });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const sanitizedUser = sanitizeUser(user);
      res.json({ user: sanitizedUser });
    } catch (error) {
      console.error('User status update error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Update user details - admin only
  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertUserSchema.partial().parse(req.body);
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const sanitizedUser = sanitizeUser(user);
      res.json({ user: sanitizedUser });
    } catch (error) {
      console.error('User update error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  // Get all commands - admin only
  app.get('/api/admin/commands', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const commands = await storage.getAllCommands();
      res.json({ commands });
    } catch (error) {
      console.error('Admin commands fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch commands' });
    }
  });
  
  // Create command - admin only
  app.post('/api/admin/commands', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const commandData = insertCommandSchema.parse(req.body);
      const command = await storage.createCommand(commandData);
      res.status(201).json({ command });
    } catch (error) {
      console.error('Command creation error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });
  
  // Update command - admin only
  app.put('/api/admin/commands/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCommandSchema.partial().parse(req.body);
      
      const command = await storage.updateCommand(id, updates);
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }
      
      res.json({ command });
    } catch (error) {
      console.error('Command update error:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  });
  
  // Delete command - admin only
  app.delete('/api/admin/commands/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCommand(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Command not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Command deletion error:', error);
      res.status(500).json({ error: 'Failed to delete command' });
    }
  });
  
  // Publish command to users - admin only
  app.put('/api/admin/commands/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const command = await storage.updateCommand(id, { publishedToUsers: true });
      
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }
      
      res.json({ command });
    } catch (error) {
      console.error('Command publish error:', error);
      res.status(500).json({ error: 'Failed to publish command' });
    }
  });
  
  // Unpublish command from users - admin only
  app.put('/api/admin/commands/:id/unpublish', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const command = await storage.updateCommand(id, { publishedToUsers: false });
      
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }
      
      res.json({ command });
    } catch (error) {
      console.error('Command unpublish error:', error);
      res.status(500).json({ error: 'Failed to unpublish command' });
    }
  });
  
  // Statistics endpoint - admin only
  app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStatistics();
      
      res.json({
        stats
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // User info endpoint - for authenticated users to get their own info
  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const sanitizedUser = sanitizeUser(user);
      res.json({ user: sanitizedUser });
    } catch (error) {
      console.error('User info error:', error);
      res.status(500).json({ error: 'Failed to fetch user info' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}