import { createClient } from "https://cdn.jsdelivr.net/npm/@liveblocks/client/+esm";

const client = createClient({
  publicApiKey: "pk_dev_n-WvOr3WBCIeypgfrI6WHGLlugoZ6WAE2F9BSFm05yOMWA-1JM8MyaQCcLlX8s5K"  
});

export default function duel() {
  const params = new URLSearchParams(window.location.search);
  const playerName = params.get("name");
  const token = params.get("token");

  if (!playerName || !token) {
    alert("Missing credentials. Please log in again.");
    window.location.href = "/login";
    return;
  }

  // Enter lobby
  const { room: lobbyRoom, leave: leaveLobby } = client.enterRoom("lobby", {
    initialPresence: { name: playerName, status: "waiting" }
  });

  // Render player list when others change
  lobbyRoom.subscribe("others", (others) => {
    renderPlayerList(others, playerName);
  });

  // Challenge flow
  document.getElementById("challengebtn").addEventListener("click", () => {
    showPlayerDropdown(lobbyRoom, playerName);
  });

  window.addEventListener("beforeunload", () => {
    leaveLobby();
  });
}

function renderPlayerList(others, currentName) {
  const listContainer = document.getElementById("playerList");
  listContainer.innerHTML = "";
  others.forEach((player) => {
    if (player.presence?.name && player.presence.name !== currentName) {
      const li = document.createElement("li");
      li.textContent = player.presence.name;
      listContainer.appendChild(li);
    }
  });
}

function showPlayerDropdown(lobbyRoom, currentName) {
  const dropdown = document.getElementById("playerDropdown");
  dropdown.classList.toggle("show");

  const listContainer = document.getElementById("playerList");
  listContainer.innerHTML = "";

  const others = lobbyRoom.getOthers();
  others.forEach((player) => {
    if (player.presence?.name && player.presence.name !== currentName) {
      const li = document.createElement("li");
      li.textContent = player.presence.name;
      li.addEventListener("click", async () => {
        try {
          const res = await fetch("/create-game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player1: currentName, player2: player.presence.name })
          });
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const { roomId } = await res.json();
          joinGameRoom(roomId, currentName);
          dropdown.classList.remove("show");
        } catch (error) {
          console.error("Error creating game:", error);
          alert("Failed to create game. Please try again.");
        }
      });
      listContainer.appendChild(li);
    }
  });
}

function joinGameRoom(roomId, playerName) {
  console.log("Joining game room:", roomId);
  
  // Show spinner while joining
  document.querySelector(".spinner").classList.remove("hidden");
  
  const { room: gameRoom, leave: leaveGame } = client.enterRoom(roomId, {
    initialPresence: { name: playerName, status: "playing" }
  });

  // Subscribe to storage changes for real-time updates
  const unsubscribeStorage = gameRoom.subscribe("storage", (storage) => {
    console.log("Storage updated:", storage);
    updateGameUI(storage.root, playerName);
  });

  // Subscribe to presence changes
  const unsubscribePresence = gameRoom.subscribe("others", (others) => {
    console.log("Other players:", others);
    updatePlayerStatus(others);
  });

  // Initialize game once storage is available
  gameRoom.getStorage().then((storage) => {
    console.log("Storage received:", storage);
    
    if (!storage) {
      console.error("No storage received");
      alert("Failed to load game data. Please try again.");
      document.querySelector(".spinner").classList.add("hidden");
      return;
    }

    const root = storage.root.toObject();
    console.log("Storage root object:", root);

    if (root && root.questions && root.players) {
      console.log("Game data is valid, initializing game...");
      
      // Hide spinner and preface card
      document.querySelector(".spinner").classList.add("hidden");
      document.querySelector(".prefaceCard").style.display = "none";
      
      // Show game elements
      document.querySelector(".questioncontainer").classList.remove("hidden");
      document.querySelector("#playersinfo").classList.remove("hidden");

      // Update player info
      updatePlayerInfo(root.players, playerName);

      // Start the quiz game
      import("./questioncontainer.js").then(({ default: questionContainerMaker }) => {
        console.log("Starting question container...");
        questionContainerMaker(
          document.querySelector(".questioncontainer"),
          root.questions,
          {
            updateScore: (score) => {
              updatePlayerScore(gameRoom, playerName, score);
            },
            updateTime: (timeRemaining) => {
              updatePlayerTime(gameRoom, playerName, timeRemaining);
            },
            endGame: (finalScore) => {
              endGame(gameRoom, playerName, finalScore);
            }
          },
          playerName
        );
      }).catch((error) => {
        console.error("Failed to load question container:", error);
        alert("Failed to load game interface. Please refresh the page.");
        document.querySelector(".spinner").classList.add("hidden");
      });
    } else {
      console.error("Game room has invalid data structure:", root);
      console.log("Questions:", root?.questions);
      console.log("Players:", root?.players);
      alert("Game data is corrupted. Please try creating a new game.");
      document.querySelector(".spinner").classList.add("hidden");
    }
  }).catch((error) => {
    console.error("Failed to get storage:", error);
    alert("Failed to load game. Please try again.");
    document.querySelector(".spinner").classList.add("hidden");
  });

  // Add timeout fallback to prevent infinite spinner
  setTimeout(() => {
    if (!document.querySelector(".spinner").classList.contains("hidden")) {
      console.warn("Game loading timeout - hiding spinner");
      document.querySelector(".spinner").classList.add("hidden");
      alert("Game is taking too long to load. Please try again.");
    }
  }, 10000); // 10 second timeout

  window.addEventListener("beforeunload", () => {
    unsubscribeStorage();
    unsubscribePresence();
    leaveGame();
  });
}

// Helper function to update player score in Liveblocks storage
function updatePlayerScore(gameRoom, playerName, score) {
  gameRoom.updateStorage((storage) => {
    const players = storage.get("players");
    if (players.get("p1").get("name") === playerName) {
      players.get("p1").set("score", score);
    } else if (players.get("p2").get("name") === playerName) {
      players.get("p2").set("score", score);
    }
  });
}

// Helper function to update player time
function updatePlayerTime(gameRoom, playerName, timeRemaining) {
  gameRoom.updateStorage((storage) => {
    const players = storage.get("players");
    if (players.get("p1").get("name") === playerName) {
      players.get("p1").set("timeRemaining", timeRemaining);
    } else if (players.get("p2").get("name") === playerName) {
      players.get("p2").set("timeRemaining", timeRemaining);
    }
  });
}

// Helper function to end the game
function endGame(gameRoom, playerName, finalScore) {
  gameRoom.updateStorage((storage) => {
    const players = storage.get("players");
    const p1Score = players.get("p1").get("score");
    const p2Score = players.get("p2").get("score");
    
    let winner = null;
    if (p1Score > p2Score) {
      winner = players.get("p1").get("name");
    } else if (p2Score > p1Score) {
      winner = players.get("p2").get("name");
    } else {
      winner = "tie";
    }
    
    storage.set("gameStatus", "finished");
    storage.set("winner", winner);
  });
}

// Update game UI based on storage changes
function updateGameUI(root, currentPlayer) {
  const players = root.players;
  if (players) {
    updatePlayerInfo(players, currentPlayer);
    
    // Check if game is finished
    if (root.gameStatus === "finished") {
      showGameResult(root.winner, currentPlayer);
    }
  }
}

// Update player information display
function updatePlayerInfo(players, currentPlayer) {
  const p1Card = document.querySelector(".p1-card");
  const p2Card = document.querySelector(".p2-card");
  const p1Status = document.querySelector(".p1status-text");
  const p2Status = document.querySelector(".p2status-text");

  if (p1Card && p2Card && p1Status && p2Status) {
    p1Status.textContent = `${players.p1.name}: ${players.p1.score} points (${players.p1.timeRemaining}s)`;
    p2Status.textContent = `${players.p2.name}: ${players.p2.score} points (${players.p2.timeRemaining}s)`;
    
    // Highlight current player
    if (players.p1.name === currentPlayer) {
      p1Card.classList.add("current-player");
      p2Card.classList.remove("current-player");
    } else {
      p2Card.classList.add("current-player");
      p1Card.classList.remove("current-player");
    }
  }
}

// Update player status based on presence
function updatePlayerStatus(others) {
  console.log("Updating player status:", others);
  // You can add logic here to show if other player is online/offline
}

// Show game result
function showGameResult(winner, currentPlayer) {
  document.querySelector(".questioncontainer").classList.add("hidden");
  
  if (winner === currentPlayer) {
    document.querySelector(".winnerbox").classList.remove("hidden");
  } else if (winner === "tie") {
    document.querySelector(".scorebox").classList.remove("hidden");
  } else {
    document.querySelector(".looserbox").classList.remove("hidden");
  }
}