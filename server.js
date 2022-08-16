const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);

const users = {};

const socketToRoom = {};
const usersInRoom = {};
const messagesInRoom = {};

io.on('connection', (socket) => {
   /** 
    if (!users[socket.id]) {
        users[socket.id] = socket.id;
    }
    socket.emit('yourID', socket.id);
    io.sockets.emit('allUsers', users);

    socket.on('disconnect', () => {
        delete users[socket.id];
    });

    socket.on('callUser', (data) => {
        io.to(data.to).emit('hey', {
            signal: data.signalData,
            from: data.from,
        });
    });

    socket.on('acceptCall', (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    });
    */
   console.log('Some one joined socketId: ' + socket.id);
   socket.on('user-joined-room', ({ userName, roomId }) => {
      const currentUser = socket.id;
      if (usersInRoom[roomId]) {
         if (usersInRoom[roomId].length === 4) {
            socket.emit('fulled-room');
            return;
         }
         usersInRoom[roomId].push({ userName, userId: currentUser });
      } else {
         usersInRoom[roomId] = [{ userName, userId: currentUser }];
      }

      if (!messagesInRoom[roomId]) {
         messagesInRoom[roomId] = [];
      }

      socketToRoom[socket.id] = roomId;

      socket.join(roomId); //for message
      /** sending all socket id already joined user in this room */
      io.sockets.emit('userInRoom', usersInRoom[roomId]);
   });

   socket.on('message-joined-room', ({ roomId }) => {
      const messageInRoom = messagesInRoom[roomId];
      io.to(roomId).emit('messageInRoom', messageInRoom);
   });

   socket.on('disconnect', () => {
      /** get User Id who leave room */
      const leaveRoomUserId = socket.id;
      /** get the room user joined */
      const roomId = socketToRoom[leaveRoomUserId];
      let socketsIdConnectedToRoom = usersInRoom[roomId];
      let leavedUser = null;
      if (socketsIdConnectedToRoom) {
         /** get User who leave room */
         leavedUser = socketsIdConnectedToRoom.find(
            (el) => el.userId === leaveRoomUserId
         );
         /** remove user from room */
         socketsIdConnectedToRoom = socketsIdConnectedToRoom.filter(
            (el) => el.userId !== leaveRoomUserId
         );

         /** send all the rest of people who are already in room */
         socketsIdConnectedToRoom.forEach((user) => {
            io.to(user.userId).emit('userLeft', {
               leavedUser,
               existedUserInRoom: usersInRoom[roomId],
            });
         });

         usersInRoom[roomId] = socketsIdConnectedToRoom;
      }

      socket.leave(roomId); //for message group(socket)
      // io.sockets.broadcast.emit('userLeft', leaveUser);
   });

   socket.on('sendMessageToServer', ({ roomId, message, currentUser }) => {
      const currentUsersInRoom = usersInRoom[roomId];
      let currentMessagesInRoom = messagesInRoom[roomId];
      if (currentMessagesInRoom) {
         currentMessagesInRoom = [
            ...currentMessagesInRoom,
            { message, userName: currentUser },
         ];
         messagesInRoom[roomId] = currentMessagesInRoom;
      }

      if (currentUsersInRoom) {
         currentUsersInRoom.forEach((user) => {
            io.to(user.userId).emit('sendMessageToClient', {
               message,
               userName: currentUser,
            });
         });
      }
   });
});

server.listen(8000, () => console.log('server is running on port 8000'));
