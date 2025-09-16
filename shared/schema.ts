import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('user'), // 'user' or 'admin'
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  openaiApiKey: text("openai_api_key"), // User's personal OpenAI API key (encrypted)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const aiCommands = pgTable("ai_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).notNull().default('0.3'),
  outputType: text("output_type").notNull().default('replace'), // 'replace', 'append', 'new_window'
  isActive: boolean("is_active").notNull().default(true),
  publishedToUsers: boolean("published_to_users").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  textProcessed: integer("text_processed").notNull().default(0),
  speechProcessed: integer("speech_processed").notNull().default(0), // in seconds
  commandsUsed: integer("commands_used").notNull().default(0),
  sessionStart: timestamp("session_start").notNull().defaultNow(),
  sessionEnd: timestamp("session_end"),
});

export const userCommandPreferences = pgTable("user_command_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  commandId: varchar("command_id").notNull().references(() => aiCommands.id, { onDelete: 'cascade' }),
  isVisible: boolean("is_visible").notNull().default(true),
  hasSeenNewBadge: boolean("has_seen_new_badge").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertCommandSchema = createInsertSchema(aiCommands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  sessionStart: true,
});

export const insertUserCommandPreferenceSchema = createInsertSchema(userCommandPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type Command = typeof aiCommands.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof userSessions.$inferSelect;
export type InsertUserCommandPreference = z.infer<typeof insertUserCommandPreferenceSchema>;
export type UserCommandPreference = typeof userCommandPreferences.$inferSelect;

// Additional schemas for API validation
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const textProcessSchema = z.object({
  text: z.string().min(1),
  commandId: z.string().min(1),
});

export const speechProcessSchema = z.object({
  audioData: z.string(), // base64 encoded audio
  format: z.string().default('webm'),
});

export const updateApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export const commandPreferenceSchema = z.object({
  commandId: z.string().min(1),
  isVisible: z.boolean(),
  hasSeenNewBadge: z.boolean().optional(),
});

// Strong password validation function
export const strongPasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter (A-Z)",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number (0-9)",
  })
  .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
    message: "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)",
  });
