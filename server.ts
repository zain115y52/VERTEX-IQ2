import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/api.js";
import { initDb } from "./server/db.js";

async function startServer() {
  try {
    await initDb();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.set("trust proxy", 1);
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/api", apiRouter);

  // Catch-all for API 404s
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Global API Error handler
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error Middleware caught:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message || "Unknown error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
