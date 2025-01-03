const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
console.log(__dirname);
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./public/duel.html"));
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
        waitingPlayers.push({ socketId: socket.id, score: 0 });
        playerJoined.push({ socketId: socket.id, name });
      }
      // Notify other waiting players if a new player is waiting
      if (waitingPlayers.length > 0) {
        const waitingPlayersIds = waitingPlayers.map((player) => player.socketId);
        io.to(waitingPlayersIds).emit("newPlayerWaiting", { waitingPlayersCount: waitingPlayers.length });
      }
    }
    socket.emit("joinedplayerlist", playerJoined);
  });

  socket.on("playermatchup", async (data) => {
    waitingPlayers = data.waitingPlayers;
    // Pair players if possible
    if (waitingPlayers.length >= 2) {
      const [player1, player2] = waitingPlayers.splice(0, 2);
      const newGame = {
        player1: { socketId: player1.socketId, score: player1.score},
        player2: { socketId: player2.socketId, score: player2.score}
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
    let findingPlayer = data.playerName;

    // Find the game where the player is involved
    let game = playerArray.find((g) => g.player1.socketId === socket.id || (g.player2 && g.player2.socketId === socket.id));

    if (game) {
      // Determine the winner based on the player name
      let winner = game.player1.socketId === socket.id ? game.player1.socketId : game.player2.socketId;

      // Emit the winner's name to all connected clients
      io.emit("winner", { winner: winner });
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
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});