export default function duel(socket,questionContainerMaker) {
  window.addEventListener("load", () => {
    document.querySelector(".spinner").style.display = "none";
  });
      let playerName ;
      let playerinfo=document.querySelector('#playersinfo');
      let questioncontainer=document.querySelector('.questioncontainer');
      let prefacecard=document.querySelector('.prefaceCard');
      let quitbtn=document.querySelector('.quitbtn');
    let searchbtn=document.querySelector('.searchbtn');
    let p1status=document.querySelector('.p1status');
    let p2status=document.querySelector('.p2status');
    document.querySelector('.submitbtn').addEventListener('click', () => {
      playerName = document.querySelector('.playername').value.trim();
      document.querySelector('.popupbox').style.display='none';
      socket.emit('palyerJoined',  playerName);
      document.querySelector('.popupbox').style.display='none';
      prefacecard.style.display="flex";
    });
     searchbtn.addEventListener('click', () => {
      if(playerName)
        socket.emit('playerJoined', {name: playerName});
      else alert("please enter your name before searching");
    prefacecard.style.display="none";
      playerinfo.style.display='flex';
     socket.on('joinedplayerlist',async (data) => {
        console.log('Joined player list:', data);
        let playerList = data;
        if(playerList.length>2){
            socket.emit('playermatchup', { waitingPlayers: playerList });
        }else p2status.innerHTML="searching for opponent";
    
      });
    socket.on("newPlayerWaiting",()=>{
      const notificationDiv = document.querySelector(".notification");
      function showNotification(){
          notificationDiv.style.display="flex";
          setTimeout(() => {
              notificationDiv.style.display="none";
          }, 3000);
      }
      showNotification();
    })
      socket.on("startGame", async(data) => {
        let allPlayers = data.allPlayers;
        let questionpackege=data.questionpackege;
        questionContainerMaker(questioncontainer,questionpackege,socket);
        
      })   
      });
    
    }
    