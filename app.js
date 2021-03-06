// reads in our .env file and makes those values available as environment variables
require('dotenv').config();
 
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const passport = require('passport');
var fs = require('fs');

 
// create an instance of an express app
const app = express();
const server = require('http').createServer(app);
// const server = require('https').createServer({
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// }, app);
const io = require('socket.io').listen(server);
 




//socket io calls

//variables
const players = {};
const conversation = {};
const rooms = [];
var roomsNum = 0;
const users = {
  online: []
}
 

io.on('connection', function (socket) {
  console.log('a user connected: ', socket.id);
  // send the user id
  socket.emit('connected', socket.id);

  //setup init conversation   
  conversation[socket.id] = {
      users: {},
  };

  //setup userdata
  users[socket.id] = {
    id: socket.id,
    room: '',
  }

  // update all other players of the new player
  //socket.broadcast.emit('newPlayer', players[socket.id]);

  users.online.push(socket.id);
  io.emit('allUsers', users);
  socket.emit('startUser', users);
  socket.broadcast.emit('newUser', socket.id);
 
  // when a player disconnects, remove them from our user object
  socket.on('disconnect', function () {
    const index = users.online.indexOf(socket.id);
    if (index > -1) {
      users.online.splice(index, 1);
    }
    delete users[socket.id];
    io.emit('allUsers', users);
    io.emit('removeUser', socket.id);
  });


  //video sockets

  //offer
  socket.on('sendOffer', function (offerData) {
    console.log('send offer');
    conversation[socket.id].users[offerData.to] = {
      to: offerData.to,
      from: offerData.from,
      offer: offerData.offer,
    };
    // emit to user for answer
    io.to(offerData.to).emit('reciveOffer', conversation[socket.id].users[offerData.to]);
  });

  //answer
  socket.on('sendAnswer', function (answerData) {
    console.log('send answer');
      conversation[answerData.to].users[socket.id].answer = answerData.answer;

      // emit to user for answer
      io.to(answerData.to).emit('reciveAnswer', conversation[answerData.to].users[socket.id]);
  });



  // join or create room
  socket.on('createOrJoinRoom', function (roomData) {
    console.log('join or create room');
    var enterRoom = '';

    if(users[roomData.addUser].room === ''){
      console.log('created new room');
      roomsNum++;
      rooms['room-'+ roomsNum] = {name:'room-'+ roomsNum, users:[]};
      rooms['room-'+ roomsNum].users.push(socket.id);
      rooms['room-'+ roomsNum].users.push(roomData.addUser);
      users[socket.id].room = 'room-'+ roomsNum;
      users[roomData.addUser].room = 'room-'+ roomsNum;
      enterRoom = 'room-'+ roomsNum;
      // io.to(roomData.addUser).emit('joinRoom', rooms['room-'+ roomsNum]);
    } else {
      console.log('joined room');
      enterRoom = users[roomData.addUser].room;
      rooms[enterRoom].users.push(socket.id);
      users[socket.id].room = enterRoom;
    }

    socket.emit('joinRoom', rooms[enterRoom]);
    io.emit('allUsers', users);
  });

  //leave chat
  socket.on('leaveRoom', function () {
    console.log('leave room');
    var removeRoom = users[socket.id].room;
    if(rooms[removeRoom]){
      const removeIndex = rooms[removeRoom].users.indexOf(socket.id);
      if (removeIndex > -1) {rooms[removeRoom].users.splice(removeIndex, 1) }
    }
    users[socket.id].room = '';
    io.emit('removeUser', socket.id);
    io.emit('allUsers', users);
  });


});







 
// update express settings
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
 
// require passport auth
require('./auth/auth');

 
app.get('/game.html', function (req, res) {
  res.sendFile(__dirname + '/public/game.html');
});
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
 
// catch all other routes
app.use((req, res, next) => {
  res.status(404).json({ message: '404 - Not Found' });
});
 
// handle errors
app.use((err, req, res, next) => {
  console.log(err.message);
  res.status(err.status || 500).json({ error: err.message });
});
 
server.listen(process.env.PORT || 8443, () => {
  console.log(`Server started on port ${process.env.PORT || 8443}`);
});