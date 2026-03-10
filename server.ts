import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = new Database("notes.db");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // Add summary column if not exists (for existing databases)
  try {
    db.prepare("ALTER TABLE notes ADD COLUMN summary TEXT").run();
  } catch (e) {
    // Column already exists, ignore
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API Routes
  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
    const notesWithTags = notes.map((note: any) => {
      const tags = db.prepare("SELECT key, value FROM tags WHERE note_id = ?").all(note.id);
      return { ...note, tags };
    });
    res.json(notesWithTags);
  });

  app.post("/api/notes", (req, res) => {
    const { content, summary, tags } = req.body;
    const insertNote = db.prepare("INSERT INTO notes (content, summary) VALUES (?, ?)");
    const result = insertNote.run(content, summary);
    const noteId = result.lastInsertRowid;

    if (tags && Array.isArray(tags)) {
      const insertTag = db.prepare("INSERT INTO tags (note_id, key, value) VALUES (?, ?, ?)");
      tags.forEach((tag: { key: string; value: string }) => {
        insertTag.run(noteId, tag.key, tag.value);
      });
    }

    const newNote = db.prepare("SELECT * FROM notes WHERE id = ?").get(noteId) as any;
    const newTags = db.prepare("SELECT key, value FROM tags WHERE note_id = ?").all(noteId);
    res.json({ ...newNote, tags: newTags });
  });

  app.put("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    db.prepare("UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(content, id);
    res.json({ success: true });
  });

  app.delete("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.delete("/api/notes", (req, res) => {
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM notes").run();
    res.json({ success: true });
  });

  // DeepSeek API Proxy
  app.post("/api/ai/chat", async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY is not set");
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is not set" });
    }

    const requestTime = Date.now();
    console.log(`[DeepSeek API] ===== Request received at ${new Date().toISOString()} =====`);
    console.log(`[DeepSeek API] Messages count: ${req.body.messages?.length || 0}`);
    console.log(`[DeepSeek API] First message length: ${req.body.messages?.[0]?.content?.length || 0}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log(`[DeepSeek API] Request timeout after ${Date.now() - requestTime}ms, aborting...`);
        controller.abort();
      }, 60000); // 60秒超时

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      console.log(`[DeepSeek API] Response status: ${response.status} (took ${Date.now() - requestTime}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepSeek API] Error response: ${errorText}`);
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      console.log(`[DeepSeek API] Success, choices: ${data.choices?.length || 0}, total time: ${Date.now() - requestTime}ms`);
      res.json(data);
    } catch (error: any) {
      console.error(`[DeepSeek API] Error after ${Date.now() - requestTime}ms:`, error.message);
      if (error.name === 'AbortError') {
        res.status(504).json({ error: "AI 响应超时（60秒）" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Metaso Search API Proxy
  app.post("/api/search", async (req, res) => {
    const apiKey = process.env.METASO_API_KEY;
    if (!apiKey) {
      console.error("METASO_API_KEY is not set");
      return res.status(500).json({ error: "METASO_API_KEY is not set" });
    }

    const { q, size = "8" } = req.body;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Search query is required" });
    }

    console.log(`[Search] Query: "${q}", Size: ${size}`);

    try {
      const response = await fetch("https://metaso.cn/api/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: q.trim(),
          scope: "webpage",
          includeSummary: false,
          size: String(size),
          includeRawContent: false,
          conciseSnippet: false,
        }),
      });

      const responseText = await response.text();
      console.log(`[Search] Response status: ${response.status}`);
      console.log(`[Search] Response body: ${responseText.substring(0, 500)}...`);

      if (!response.ok) {
        return res.status(response.status).json({ error: `Metaso API error: ${responseText}` });
      }

      // Parse and forward the JSON response
      try {
        const data = JSON.parse(responseText);
        res.json(data);
      } catch (parseError) {
        console.error("Failed to parse Metaso response as JSON:", responseText);
        res.status(500).json({ error: "Invalid JSON response from Metaso API" });
      }
    } catch (error: any) {
      console.error("[Search] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Metaso Reader API Proxy - Extract webpage content
  app.post("/api/reader", async (req, res) => {
    const apiKey = process.env.METASO_API_KEY;
    if (!apiKey) {
      console.error("METASO_API_KEY is not set");
      return res.status(500).json({ error: "METASO_API_KEY is not set" });
    }

    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(`[Reader] Extracting content from: "${url}"`);

    try {
      const response = await fetch("https://metaso.cn/api/v1/reader", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "text/plain",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const content = await response.text();
      console.log(`[Reader] Response status: ${response.status}`);

      if (!response.ok) {
        return res.status(response.status).json({ error: `Metaso Reader API error: ${content}` });
      }

      res.json({ content });
    } catch (error: any) {
      console.error("[Reader] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
