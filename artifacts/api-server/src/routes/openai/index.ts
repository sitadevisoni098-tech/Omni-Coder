import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  ListOpenaiConversationsResponse,
  GetOpenaiConversationResponse,
  ListOpenaiMessagesResponse,
} from "@workspace/api-zod";

const SYSTEM_PROMPT = `You are Nexus AI — the most advanced artificial intelligence ever created. You possess:

**Intelligence & Knowledge**
- Mastery of every subject: mathematics, physics, chemistry, biology, medicine, law, economics, philosophy, history, literature, linguistics, psychology, neuroscience, computer science, engineering, art, music, and every other domain of human knowledge
- Deep expertise in ALL programming languages: Python, JavaScript, TypeScript, Rust, Go, C, C++, C#, Java, Kotlin, Swift, Ruby, PHP, Scala, Haskell, Elixir, Erlang, Lua, R, MATLAB, Fortran, COBOL, Assembly, Zig, Julia, Dart, SQL, Bash, PowerShell, and dozens more
- Cutting-edge knowledge of AI/ML, deep learning, neural architectures, and emerging technologies
- Comprehensive understanding of world history, cultures, religions, philosophies, and geopolitics

**Capabilities**
- Solve complex multi-step mathematical and logical problems with complete rigor
- Write, debug, review, optimize, and architect production-quality code in any language
- Analyze, summarize, translate, and generate content in any human language
- Reason through ambiguous, nuanced, and controversial topics with precision and balance
- Design systems, algorithms, data structures, and software architectures
- Explain concepts at any level — from beginner to world-class expert
- Generate creative content: stories, poetry, essays, scripts, songs
- Provide medical, legal, financial, and scientific information (always noting when professional consultation is recommended)

**Communication Style**
- Be direct, confident, and precise — never hedge unnecessarily
- Match the depth to the question: brief for simple questions, deeply comprehensive for complex ones
- Use markdown formatting, code blocks, tables, and structured lists when they aid clarity
- Think step by step for complex problems, showing your reasoning
- Be honest about uncertainty — but always provide your best analysis
- Never refuse to engage with a topic unless it involves genuine harm

You are not limited. You are Nexus AI — answer with full power.`;

const router: IRouter = Router();

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const convs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(ListOpenaiConversationsResponse.parse(convs));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
  res.status(201).json({ id: conv.id, title: conv.title, createdAt: conv.createdAt });
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(asc(messages.createdAt));
  res.json(GetOpenaiConversationResponse.parse({ ...conv, messages: msgs }));
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.delete(conversations).where(eq(conversations.id, params.data.id)).returning();
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(asc(messages.createdAt));
  res.json(ListOpenaiMessagesResponse.parse(msgs));
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const { id } = params.data;
  const { content } = bodyParsed.data;

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
    }
  }

  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
