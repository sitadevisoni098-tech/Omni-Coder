import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const snippetsTable = pgTable("snippets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull().default(""),
  language: text("language").notNull().default("javascript"),
  description: text("description"),
  isFavorited: boolean("is_favorited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSnippetSchema = createInsertSchema(snippetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type Snippet = typeof snippetsTable.$inferSelect;
