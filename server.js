const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require('cors');
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
const passport=require('./config/passport');
const cookieparser=require('cookie-parser');
const profileRoutes = require('./routes/profile.cjs');


// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'https://git-3wi2.onrender.com', 'https://quize-app-qan3.onrender.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
};

// Add proper MIME type for JavaScript modules
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieparser());
app.use(passport.initialize());
app.use('/', profileRoutes);
//app.use(passport.session());

// Add CORS headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Socket.IO CORS configuration
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://git-3wi2.onrender.com', 'https://quize-app-qan3.onrender.com'],
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Cookie']
    }
});
app.get('/profile', passport.authenticate('cookie', { session: false }), (req, res) => {
    try {
        console.log('User from request:', req.user);
        console.log('Cookies:', req.cookies);
        
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        res.json({ 
            status: "success",
            profile: req.user 
        });
    } catch (error) {
        console.error('Profile route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//function to import quize
async function quizdata(noOfQuestion, catagoryind) {

  if (noOfQuestion === 0) noOfQuestion = 10;

  async function fetchData(URL) {
    try {
      const response = await fetch(URL); 
      // Parse the response as JSON
      const data = await response.json();  
     
      return data.results;
  
    } catch (err) {
      console.error(err);
    }
  }

  let baseURL = `https://opentdb.com/api.php?amount=${noOfQuestion}`;
  
  if (catagoryind !== undefined) {
      let URL = `${baseURL}&category=${catagoryind}`;  // Correct 'catagory' to 'category'
      let data=fetchData(URL);
      return data;
  } else {
      let data=fetchData(baseURL);
      return data;
  }

}

console.log(__dirname);
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "duel.html"));
});

// Catch-all route last
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "duel.html"));
});

// Game state management
let waitingPlayers = []; // Waiting players queue
let playerArray = [];    // Active games
let playerJoined = [];   // Array to keep track of joined players

// Socket.IO handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Player joining logic
  socket.on("playerJoined", (data) => {
    const { name } = data;

    if (name) {
      console.log("Player joined:", name);

      // Check if player is reconnecting
      const existingPlayer = waitingPlayers.find((player) => player.socketId === socket.id);
      if (existingPlayer) {
        console.log("Player reconnected:", name);
      } else {
        // Add player to waiting queue
        waitingPlayers.push({ socketId: socket.id,name, score: 0 });
        playerJoined.push({ socketId: socket.id, name });
      }
 
    }
    socket.emit("joinedplayerlist", playerJoined);
  });

  socket.on("playermatchup", async (data) => {
    console.log("form matchup:", data);
    waitingPlayers = data.waitingPlayers;
    // Pair players if possible
    if (waitingPlayers.length >= 2) {
      const [player1, player2] = waitingPlayers.splice(0, 2);
      const newGame = {
        player1: { socketId: player1.socketId,name:player1.name, score: player1.score},
        player2: { socketId: player2.socketId,name:player2.name, score: player2.score}
      };

      playerArray.push(newGame);
      const questionpackege = await quizdata(10);
      // Create a private room for the game
      socket.join(player1.socketId);
      socket.join(player2.socketId);
      // Notify both players to start the game
      io.to(player1.socketId).emit("startGame", { allPlayers: playerArray, questionpackege: questionpackege });
      io.to(player2.socketId).emit("startGame", { allPlayers: playerArray, questionpackege: questionpackege });
    }
  });
  socket.on('challengeAccepted', async (data) => {
    const challenger = playerJoined.find(player => player.socketId === data.challengerId);
    const challenged = playerJoined.find(player => player.socketId === socket.id);
    
    if (challenger && challenged) {
      // Create new game
      const newGame = {
        player1: { 
          socketId: challenger.socketId,
          name: challenger.name, 
          score: 0
        },
        player2: { 
          socketId: challenged.socketId,
          name: challenged.name, 
          score: 0
        }
      };

      // Add to active games
      playerArray.push(newGame);

      // Get questions
      const questionpackege = await quizdata(10);

      // Notify both players to start the game
      io.to(challenger.socketId).emit("startGame", { 
        allPlayers: [newGame], 
        questionpackege: questionpackege 
      });
      
      io.to(challenged.socketId).emit("startGame", { 
        allPlayers: [newGame], 
        questionpackege: questionpackege 
      });

      // Remove players from waiting list
      waitingPlayers = waitingPlayers.filter(
        player => player.socketId !== challenger.socketId && 
                 player.socketId !== challenged.socketId
      );
    }
  });
  socket.on("challengeRejected", (data) => {
    const challenger = playerJoined.find(player => player.socketId === data.challengerId);
    
    if (challenger) {
      // Send rejection message to challenger
      io.to(challenger.socketId).emit("challengeResponse", {
        status: "rejected",
        message: `${data.name} has rejected your challenge`,
        challengedName: data.name
      });
    }
  });
  // Handle game reset
  socket.on("resetGame", () => {
    // Find the game the player belongs to
    const game = playerArray.find(
      (g) => g.player1.socketId === socket.id || (g.player2 && game.player2.socketId === socket.id)
    );

    if (game) {
      const opponentSocketId = game.player1.socketId === socket.id ? game.player2.socketId : game.player1.socketId;

      // Notify the opponent that the game has been restarted
      io.to(opponentSocketId).emit("opponentRestarted");

      // Remove both players from the game
      playerArray = playerArray.filter((g) => g !== game);

      // Add the opponent back to the waiting queue
      const opponent = waitingPlayers.find((player) => player.socketId === opponentSocketId);
      if (!opponent) {
        waitingPlayers.push({ socketId: opponentSocketId, score: 0 });
      }
    }
  });

  socket.on("gameOver", (data) => {
    let { playerName, score, time } = data;

    // Find the game where the player is involved
    let game = playerArray.find((g) => 
      g.player1.socketId === socket.id || (g.player2 && g.player2.socketId === socket.id)
    );

    if (game) {
      // Update scores and times for the players
      if (game.player1.socketId === socket.id) {
        game.player1.score = score;
        game.player1.time = time;
      } else {
        game.player2.score = score;
        game.player2.time = time;
      }

      // Determine winner based on score and time
      let winner;
      if (game.player1.score > game.player2.score) {
        winner = game.player1;
      } else if (game.player2.score > game.player1.score) {
        winner = game.player2;
      } else {
        // If scores are tied, compare completion times
        winner = game.player1.time < game.player2.time ? game.player1 : game.player2;
      }

      // Emit winner details
      io.emit("winner", { 
        winner: winner.socketId,
        winnerName: winner.name,
        winnerScore: winner.score,
        winnerTime: winner.time
      });
    }
  });
socket.on('challengePlayer', (data) => {
  let {challenger, challenged} = data;
  
  // Find the challenged player's socket ID from playerJoined array
  const challengedPlayer = playerJoined.find(player => player.name === challenged);
  
  if (challengedPlayer) {
    // Emit notification to the challenged player
    io.to(challengedPlayer.socketId).emit('newPlayerWaiting', {
      name: challenger,
      challengerId: socket.id
    });
  }
});
  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  
    waitingPlayers = waitingPlayers.filter((player) => player.socketId !== socket.id);
    playerJoined = playerJoined.filter((player) => player.socketId !== socket.id);
  
    playerArray = playerArray.filter((game) => {
      const isDisconnected =
        game.player1.socketId === socket.id || (game.player2 && game.player2.socketId === socket.id);
  
      if (isDisconnected) {
        const opponentSocketId =
          game.player1.socketId === socket.id ? game.player2?.socketId : game.player1.socketId;
  
        if (opponentSocketId) {
          io.to(opponentSocketId).emit("opponentDisconnected");
        }
      }
  
      return !isDisconnected;
    });
  
    console.log("Updated player and game states.");
  });
  });

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});