import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = new Database("notes.db");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
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

  app.use(express.json());

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
    const { content, tags } = req.body;
    const insertNote = db.prepare("INSERT INTO notes (content) VALUES (?)");
    const result = insertNote.run(content);
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
