import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import friendroutes from "./src/routes/friends.route.js";
import authRoutes from "./src/routes/auth.route.js";
import userRoutes from "./src/routes/user.route.js";
import chatRoutes from "./src/routes/chat.route.js";
import { connectDB } from "./src/lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

// ✅ Connect to MongoDB before starting the server
const startServer = async () => {
  await connectDB();

  // ✅ CORS Configuration
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    })
  );

  // ✅ Middleware
  app.use(express.json());
  app.use(cookieParser());

  // ✅ API Routes (no `/api` prefix as per your requirement)
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/chat", chatRoutes);
  app.use("/friends", friendroutes);

  // ✅ Optional: Serve frontend in production
  // if (process.env.NODE_ENV === "production") {
  //   app.use(express.static(path.join(__dirname, "../frontend/dist")));
  //   app.get("*", (req, res) => {
  //     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  //   });
  // }

  // ✅ Health Check Routes
  app.get("/", (req, res) => {
    res.send("✅ TalkNest Backend is running on Render!");
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Backend is live!" });
  });

  // ✅ Start server
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
