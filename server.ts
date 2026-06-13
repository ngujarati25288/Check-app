import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/api-router";

const app = express();
const PORT = 3000;

// Mount API router
app.use("/api", apiRouter);

// Common APIs error boundary (ensures JSON response for all error states under /api)
app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("API boundary catch:", err);
  res.status(err.status || 500).json({
    error: err.message || "આંતરિક સર્વર એરર (Internal Server Error)"
  });
});

// Integration with Vite Middleware (for development) and Express Asset static distribution (for production)
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrap error:", err);
});
