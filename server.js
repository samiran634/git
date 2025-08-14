// server.js
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import profileRoutes from "./routes/profile.cjs";
import quizedata from "./public/javascript/questionpakege.js";
import dotenv from "dotenv";
dotenv.config();

import { Liveblocks } from "@liveblocks/node";

const __dirname = path.resolve();
const app = express();
const port = process.env.PORT || 3000;

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });

const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/", profileRoutes);

// Serve duel frontend
app.use(express.static("public"));

// Profile route
app.get("/profile", passport.authenticate("cookie", { session: false }), (req, res) => {
  const token = req.cookies.token;
  if (!token || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ status: "success", profile: req.user });
});

app.post("/create-game", async (req, res) => {
  try {
    const { player1, player2 } = req.body;

    if (!player1 || !player2) {
      return res.status(400).json({ error: "Both players are required" });
    }

    // Generate unique room ID
    const roomId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get questions for the game
    const questions = await quizedata(10);
    
    if (!questions || questions.length === 0) {
      return res.status(500).json({ error: "Failed to generate questions" });
    }

    // Create room with initial storage using defaultStorage
    await liveblocks.rooms.create(roomId, {
      defaultAccesses: ["room:write"],
      defaultStorage: {
        players: {
          p1: { 
            name: player1, 
            score: 0, 
            timeRemaining: 100,
            isReady: false,
            currentQuestionIndex: 0
          },
          p2: { 
            name: player2, 
            score: 0, 
            timeRemaining: 100,
            isReady: false,
            currentQuestionIndex: 0
          }
        },
        questions: questions,
        gameStatus: "waiting", // waiting -> in-progress -> finished
        currentQuestionIndex: 0,
        winner: null,
        startTime: null,
        endTime: null
      },
      metadata: {
        gameType: "quiz-duel",
        createdAt: new Date().toISOString(),
        players: [player1, player2]
      }
    });

    console.log(`Room ${roomId} created successfully with players: ${player1} & ${player2}`);
    console.log(`Questions loaded: ${questions.length}`);

    res.json({ 
      roomId,
      message: "Game created successfully",
      playersCount: 2,
      questionsCount: questions.length
    });

  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({ 
      error: "Failed to create game",
      details: error.message 
    });
  }
});

// Optional: Add route to get game status
app.get("/game/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = liveblocks.rooms.get(roomId);
    
    res.json({
      roomId,
      room: room,
      status: "success"
    });
    
  } catch (error) {
    console.error("Error getting game:", error);
    res.status(404).json({ 
      error: "Game not found",
      details: error.message 
    });
  }
});

// Optional: Add route to delete finished games (cleanup)
app.delete("/game/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    
    await liveblocks.rooms.delete(roomId);
    
    res.json({
      message: "Game deleted successfully",
      roomId
    });
    
  } catch (error) {
    console.error("Error deleting game:", error);
    res.status(500).json({ 
      error: "Failed to delete game",
      details: error.message 
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "duel.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});