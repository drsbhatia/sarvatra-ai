import { type User, type InsertUser, type Command, type InsertCommand, type Session, type InsertSession, type UserCommandPreference, type InsertUserCommandPreference } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // AI Commands management
  getCommand(id: string): Promise<Command | undefined>;
  getAllCommands(): Promise<Command[]>;
  getActiveCommands(): Promise<Command[]>;
  getPublishedCommands(): Promise<Command[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: string, updates: Partial<Command>): Promise<Command | undefined>;
  deleteCommand(id: string): Promise<boolean>;
  
  // Session tracking
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getUserSessions(userId: string): Promise<Session[]>;
  
  // User Command Preferences
  getUserCommandPreference(userId: string, commandId: string): Promise<UserCommandPreference | undefined>;
  getUserCommandPreferences(userId: string): Promise<UserCommandPreference[]>;
  setUserCommandPreference(preference: InsertUserCommandPreference): Promise<UserCommandPreference>;
  updateUserCommandPreference(userId: string, commandId: string, updates: Partial<UserCommandPreference>): Promise<UserCommandPreference | undefined>;
  
  // Statistics
  getAdminStatistics(): Promise<{
    totalUsers: number;
    totalCommands: number;
    activeUsers: number;
    pendingUsers: number;
    publishedCommands: number;
    usageToday: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private commands: Map<string, Command>;
  private sessions: Map<string, Session>;
  private userCommandPreferences: Map<string, UserCommandPreference>;
  private initialized = false;

  constructor() {
    this.users = new Map();
    this.commands = new Map();
    this.sessions = new Map();
    this.userCommandPreferences = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    
    // Add default admin user with hashed password
    const adminId = randomUUID();
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    const admin: User = {
      id: adminId,
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      status: 'approved',
      openaiApiKey: null,
      createdAt: new Date(),
      lastLoginAt: null
    };
    this.users.set(adminId, admin);
    
    // Add default AI commands
    this.addDefaultCommands();
    this.initialized = true;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || 'user',
      status: (insertUser.role === 'admin') ? 'approved' : 'pending',
      openaiApiKey: null,
      createdAt: new Date(),
      lastLoginAt: null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // AI Commands methods
  async getCommand(id: string): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async getAllCommands(): Promise<Command[]> {
    return Array.from(this.commands.values());
  }

  async getActiveCommands(): Promise<Command[]> {
    return Array.from(this.commands.values()).filter(cmd => cmd.isActive);
  }

  async getPublishedCommands(): Promise<Command[]> {
    return Array.from(this.commands.values()).filter(cmd => cmd.isActive && cmd.publishedToUsers);
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = randomUUID();
    const command: Command = {
      id,
      name: insertCommand.name,
      prompt: insertCommand.prompt,
      temperature: insertCommand.temperature || '0.3',
      outputType: insertCommand.outputType || 'replace',
      isActive: insertCommand.isActive ?? true,
      publishedToUsers: insertCommand.publishedToUsers ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.commands.set(id, command);
    return command;
  }

  async updateCommand(id: string, updates: Partial<Command>): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;
    
    const updatedCommand = { ...command, ...updates, updatedAt: new Date() };
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }

  async deleteCommand(id: string): Promise<boolean> {
    return this.commands.delete(id);
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      userId: insertSession.userId,
      textProcessed: insertSession.textProcessed || 0,
      speechProcessed: insertSession.speechProcessed || 0,
      commandsUsed: insertSession.commandsUsed || 0,
      sessionStart: new Date(),
      sessionEnd: insertSession.sessionEnd || null
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  // User Command Preferences methods
  async getUserCommandPreference(userId: string, commandId: string): Promise<UserCommandPreference | undefined> {
    const key = `${userId}-${commandId}`;
    return this.userCommandPreferences.get(key);
  }

  async getUserCommandPreferences(userId: string): Promise<UserCommandPreference[]> {
    return Array.from(this.userCommandPreferences.values()).filter(pref => pref.userId === userId);
  }

  async setUserCommandPreference(preference: InsertUserCommandPreference): Promise<UserCommandPreference> {
    const id = randomUUID();
    const key = `${preference.userId}-${preference.commandId}`;
    const fullPreference: UserCommandPreference = {
      id,
      ...preference,
      isVisible: preference.isVisible ?? true,
      hasSeenNewBadge: preference.hasSeenNewBadge ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userCommandPreferences.set(key, fullPreference);
    return fullPreference;
  }

  async updateUserCommandPreference(userId: string, commandId: string, updates: Partial<UserCommandPreference>): Promise<UserCommandPreference | undefined> {
    const key = `${userId}-${commandId}`;
    const existing = this.userCommandPreferences.get(key);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.userCommandPreferences.set(key, updated);
    return updated;
  }

  // Statistics methods
  async getAdminStatistics(): Promise<{
    totalUsers: number;
    totalCommands: number;
    activeUsers: number;
    pendingUsers: number;
    publishedCommands: number;
    usageToday: number;
  }> {
    const allUsers = Array.from(this.users.values());
    const allCommands = Array.from(this.commands.values());
    const allSessions = Array.from(this.sessions.values());
    
    // Calculate statistics
    const totalUsers = allUsers.length;
    const totalCommands = allCommands.length;
    const activeUsers = allUsers.filter(user => user.status === 'approved').length;
    const pendingUsers = allUsers.filter(user => user.status === 'pending').length;
    const publishedCommands = allCommands.filter(cmd => cmd.publishedToUsers).length;
    
    // Calculate today's usage (sessions started today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const usageToday = allSessions.filter(session => 
      session.sessionStart >= today && session.sessionStart < tomorrow
    ).reduce((total, session) => total + session.commandsUsed, 0);
    
    return {
      totalUsers,
      totalCommands,
      activeUsers,
      pendingUsers,
      publishedCommands,
      usageToday
    };
  }

  private addDefaultCommands() {
    const defaultCommands = [
      {
        name: 'Summarize',
        prompt: 'Please provide a concise summary of the following text:',
        temperature: '0.3',
        outputType: 'replace',
        isActive: true
      },
      {
        name: 'Medical Notes',
        prompt: 'Format this patient information as structured medical notes following standard documentation practices:',
        temperature: '0.1',
        outputType: 'new_window',
        isActive: true
      },
      {
        name: 'Improve Writing',
        prompt: 'Improve the grammar, style, and clarity of this text while maintaining the original meaning:',
        temperature: '0.5',
        outputType: 'replace',
        isActive: true
      }
    ];

    defaultCommands.forEach(cmd => {
      const id = randomUUID();
      const command: Command = {
        id,
        name: cmd.name,
        prompt: cmd.prompt,
        temperature: cmd.temperature || '0.3',
        outputType: cmd.outputType || 'replace',
        isActive: cmd.isActive ?? true,
        publishedToUsers: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.commands.set(id, command);
    });
  }
}

export const storage = new MemStorage();

// Initialize storage with hashed passwords
storage.initialize().catch(console.error);
