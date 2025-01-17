export default async function duel(socket,questionContainerMaker) {
  // Get JWT token from URL query params
  window.addEventListener('load', async () => {
    document.querySelector(".spinner").style.display = "none";
    const fullUrl = window.location.href;
    let token;
    
    // Extract token from URL after "?token="
    if (fullUrl.includes('?token=')) {
        token = fullUrl.split('?token=')[1];
        // Remove any additional query params if present
        token = token.split('&')[0];
        alert(`Token: ${token}`);
    }
  
    // If token exists, store it as cookie with proper attributes
    if (token) {
        document.cookie = `token=${token}; path=/; secure; samesite=strict; max-age=3600`;
        console.log("Cookie set:", document.cookie);
    } else {
        alert("No authentication token found. Redirecting to login...");
        console.error("No token found in URL");
        window.location.href = 'https://quize-app-qan3.onrender.com/login';
        return;
    }

    // Move the profile fetch inside the load event handler
    try {
        let playerName = await fetch("https://quize-app-qan3.onrender.com/profile", {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'token':token
            },
            credentials:"include"
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Profile fetch failed: ${response.status}`);
            }
            return response.json();
        });

        // Initialize game with player name
        if (playerName) {
            initializeGame(socket, playerName, questionContainerMaker);
        } else {
            alert("Could not get player profile. Please login again.");
            window.location.href = 'https://quize-app-qan3.onrender.com/login';
        }
    } catch (error) {
        alert(`Authentication error: ${error.message}. Redirecting to login...`);
        console.error("Profile fetch error:", error);
        window.location.href = 'https://quize-app-qan3.onrender.com/login';
    }
  });
}

// Separate function to initialize game components
function initializeGame(socket, playerName, questionContainerMaker) {
    let playerList = [];
    let playerinfo = document.querySelector('#playersinfo');
    let questionContainer = document.querySelector('.questioncontainer');
    let prefacecard = document.querySelector('.prefaceCard');
    let searchbtn = document.querySelector('#searchbtn');
    let p1status = document.querySelector('.p1status');
    let p2status = document.querySelector('.p2status');
    let searching = document.querySelector('.searching');
    let challengebtn = document.querySelector('#challengebtn');
    let playerDropdown = document.querySelector('#playerDropdown');
    let playerListContainer = document.querySelector('#playerList');

    // Function to create player list item
    function createPlayerListItem(player) {
        return `
            <li class="player-list-item" data-player-id="${player.id}">
                <img src="https://cdn-icons-png.flaticon.com/512/149/149071.png" alt="Player Avatar">
                <span>${player.name}</span>
            </li>
        `;
    }

    if (playerName) {
        socket.emit('playerJoined', {name: playerName});
        prefacecard.classList.remove("hidden");
    } else {
        alert("Player authentication failed. Please login to continue.");
        window.location.href = 'https://quize-app-qan3.onrender.com/login';
    }

    socket.on('joinedplayerlist',  (data) => {
        console.log('Joined player list:', data);
        playerList = data;
    });

    searchbtn.addEventListener('click', () => {
        if(playerList.length>=2){
            searching.classList.add("hidden");
        } else {
            searching.classList.remove("hidden");
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!playerDropdown.contains(event.target) && 
                !challengebtn.contains(event.target)) {
                playerDropdown.classList.remove('show');
            }
        });

        socket.emit('playermatchup', { waitingPlayers: playerList });

        let f = 0;
        socket.on("startGame",  (data) => {
            searching.classList.add("hidden");
            console.log("from startgame",data);
            prefacecard.style.display="none";
            let allPlayers = data.allPlayers;
            console.log(allPlayers)
            playerinfo.classList.remove('hidden');
            // let game=allPlayers.find((ele)=>ele.player1.name===playerName);
            // if(game){
            //   p1status.innerHTML=game.find((ele)=>ele.name===playerName);
            // }
            let questionPackege = data.questionpackege;
            questionContainer.classList.remove('hidden');
            if(f==0){
                questionContainerMaker(questionContainer,questionPackege,socket);
                f=1;
            }        
        });

        socket.on("winner",(data)=>{
            let {winner,winnername,winnerScore} = data;
            if(socket.id==winner){
                alert("congratulation your bank account has been creadited with 1cr ")
            } else {
                alert(`why you even born you can't even win a quize.${winnername} has surpassed you`);
            }
        });
    });

    challengebtn.addEventListener("click", () => {
        // Toggle dropdown visibility with the correct class
        playerDropdown.classList.toggle('show');

        // Clear existing list
        playerListContainer.innerHTML = '';
        
        // Filter out current player and create list items
        playerList.forEach(player => {
            if (player.name !== playerName) {  // Fixed comparison
                playerListContainer.innerHTML += createPlayerListItem(player);
            }
        });

        // Add click handlers to player items
        document.querySelectorAll('.player-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const selectedPlayer = item.querySelector('span').textContent;
                socket.emit('challengePlayer', {
                    challenger: playerName,
                    challenged: selectedPlayer
                });
                playerDropdown.classList.remove('show');
                console.log("notification sent");
            });
        });

        socket.on("newPlayerWaiting",(data)=>{
            const notificationDiv = document.querySelector(".notification");
            function showNotification(){
                notificationDiv.classList.add("flex");
                notificationDiv.innerHTML = `
                    <div class="notification-content">
                        <p>Do you want to accept challenge from ${data.name} player?</p>
                        <div class="notification-buttons">
                            <button class="notification-btn accept">Yes</button>
                            <button class="notification-btn reject">No</button>
                        </div>
                    </div>
                `;
                showNotification();
                // Add event listeners to buttons
                const acceptBtn = notificationDiv.querySelector('.accept');
                const rejectBtn = notificationDiv.querySelector('.reject');
                
                acceptBtn.addEventListener('click', () => {
                    socket.emit('challengeAccepted', data);
                    notificationDiv.classList.remove("flex");
                });
                
                rejectBtn.addEventListener('click', () => {
                    socket.emit('challengeRejected', data);
                    notificationDiv.classList.remove("flex");
                });
            }
            showNotification();
        });
    });

    socket.on("challengeResponse", (data) => {
        const notificationDiv = document.querySelector(".notification");
        notificationDiv.innerHTML = `
            <div class="notification-content">
                <p>${data.message}</p>
            </div>
        `;
        notificationDiv.classList.add("show");
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notificationDiv.classList.remove("show");
        }, 3000);

        socket.on("startGame",  (data) => {
            let f = 0;
            searching.classList.add("hidden");
            console.log("from startgame",data);
            prefacecard.style.display="none";
            let allPlayers = data.allPlayers;
            console.log(allPlayers)
            playerinfo.classList.remove('hidden');
            // let game=allPlayers.find((ele)=>ele.player1.name===playerName);
            // if(game){
            //   p1status.innerHTML=game.find((ele)=>ele.name===playerName);
            // }
            let questionPackege = data.questionpackege;
            questionContainer.classList.remove('hidden');
            if(f==0){
                questionContainerMaker(questionContainer,questionPackege,socket,playerName);
                f=1;
            }        
        });

        socket.on("winner",(data)=>{
            let {winner,winnername,winnerScore} = data;
            if(socket.id==winner){
                alert("congratulation your bank account has been creadited with 1cr ")
            } else {
                alert(`why you even born you can't even win a quize.${winnername} has surpassed you`);
            }
        });
    });
    initializeGame(socket,playerName,questionContainer);
}




    