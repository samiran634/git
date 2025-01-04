export default function duel(socket,questionContainerMaker) {
  window.addEventListener("load", () => {
    document.querySelector(".spinner").style.display = "none";
  });
      let playerName ;
      let playerList=[];
      let playerinfo=document.querySelector('#playersinfo');
      let questionContainer=document.querySelector('.questioncontainer');
      let prefacecard=document.querySelector('.prefaceCard');
    let searchbtn=document.querySelector('#searchbtn');
    let p1status=document.querySelector('.p1status');
    let p2status=document.querySelector('.p2status');
    let searching=document.querySelector('.searching');
    document.querySelector('.submitbtn').addEventListener('click', () => {
      playerName = document.querySelector('.playername').value.trim();
      if (playerName) {
      document.querySelector('.popupbox').classList.add('hidden');
      socket.emit('palyerJoined',  playerName);
      prefacecard.classList.remove("hidden");
      }
      else {
        alert('Please enter your name');
      }
    });
     searchbtn.addEventListener('click', () => {
        socket.emit('playerJoined', {name: playerName});
     socket.on('joinedplayerlist',  (data) => {
        console.log('Joined player list:', data);
         playerList = data;
        if(playerList.length>=2){
          searching.classList.add("hidden");
            socket.emit('playermatchup', { waitingPlayers: playerList });
        }else   searching.classList.remove("hidden");
    
      });
    socket.on("newPlayerWaiting",()=>{
      const notificationDiv = document.querySelector(".notification");
      function showNotification(){
          notificationDiv.classList.add("flex");
          setTimeout(() => {
            notificationDiv.classList.remove("flex");
              notificationDiv.classList.add("hidden");
          }, 3000);
      }
      showNotification();
    })
    let f=0;
      socket.on("startGame",  (data) => {
        searching.classList.add("hidden");
        console.log("from startgame",data);
        prefacecard.style.display="none";
        let allPlayers = data.allPlayers;
        playerinfo.classList.remove('hidden');
        // let game=allPlayers.find((ele)=>ele.player1.name===playerName);
        // if(game){
        //   p1status.innerHTML=game.find((ele)=>ele.name===playerName);
        // }
        let questionPackege=data.questionpackege;
        questionContainer.classList.remove('hidden');
        if(f==0){
          questionContainerMaker(questionContainer,questionPackege,socket);
          f=1;
        }

        
      })   
      });
    
    }

    