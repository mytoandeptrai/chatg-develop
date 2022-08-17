import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import PeopleVideo from './PeopleVideo';
import { removeDuplicateUsers } from './utils';

function generateUserName(length) {
   var result = '';
   var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

const RoomScreen = (props) => {
   const { roomId } = useParams();
   const [usersInRoom, setUsersInRoom] = useState([]);
   const [messages, setMessages] = useState([]);
   const [currentUser, setCurrentUser] = useState(null);
   const [peers, setPeers] = useState([]); // state for rendering and also have stream of peers
   // console.log(
   //    '🚀 ~ file: RoomScreen.js ~ line 25 ~ RoomScreen ~ peers',
   //    peers
   // );

   const socket = useRef();
   const messageRef = useRef();
   const webCamStream = useRef();
   const userVideo = useRef();
   const peersRef = useRef([]); // collection of peers who are currently connect to a room

   useEffect(() => {
      socket.current = io.connect('http://localhost:8000');

      const user = generateUserName(5);
      let _user = {};

      navigator.mediaDevices
         .getUserMedia({ video: true, audio: true })
         .then((stream) => {
            webCamStream.current = stream;
            if (userVideo.current) {
               userVideo.current.srcObject = webCamStream.current;
            }

            if (!webCamStream.current.getAudioTracks()[0].enabled)
               webCamStream.current.getAudioTracks()[0].enabled = true;
         });

      socket.current.emit('user-joined-room', {
         userName: user,
         roomId,
      });

      socket.current.emit('message-joined-room', {
         roomId,
      });

      socket.current.on('fulled-room', () => {
         alert('Full room rồi');
         return;
      });

      socket.current.on('yourID', (userId) => {
         _user = {
            userId,
            userName: user,
         };
         setCurrentUser({
            userId,
            userName: user,
         });
      });

      socket.current.on('userInRoom', (usersInRoom) => {
         setUsersInRoom(usersInRoom);
         const peers = [];
         usersInRoom.forEach((otherUserSocketId) => {
            const peer = createPeer(
               otherUserSocketId.userId,
               currentUser,
               webCamStream.current
            );

            peersRef.current.push({
               peerId: otherUserSocketId.userId,
               peer,
            });

            peers.push({
               peerId: otherUserSocketId.userId,
               peer,
            });
         });

         setPeers(peers);
      });

      socket.current.on('messageInRoom', (messages) => {
         if (messages) {
            setMessages(messages);
         }
      });

      socket.current.on('userLeft', ({ leavedUser, existedUserInRoom }) => {
         const onlineUserInRoom = existedUserInRoom.filter(
            (el) => el.userId !== leavedUser.userId
         );
         setUsersInRoom(onlineUserInRoom);
         console.log(`User ${leavedUser.userName} left the room`);
      });

      socket.current.on('sendMessageToClient', (payload) => {
         console.log(payload);
         setMessages((prev) => [...prev, payload]);
      });

      socket.current.on('userJoined', ({ signal, callerId }) => {
         const peer = addPeer(signal, callerId, webCamStream.current);
         peersRef.current.push({
            peerId: callerId,
            peer,
         });
         const peerObj = {
            peer,
            peerId: callerId,
         };
         setPeers((users) => [...users, peerObj]);
      });
   }, []);

   const sendMessage = (e) => {
      e.preventDefault();
      if (socket.current) {
         socket.current.emit('sendMessageToServer', {
            roomId,
            message: messageRef.current.value,
            currentUser,
         });
         messageRef.current.value = '';
      }
   };

   const createPeer = (userIdToSendSignal, callerId, stream) => {
      const peer = new Peer({
         initiator: true,
         trickle: false,
         stream,
      });

      peer.on('signal', (signal) => {
         socket.current.emit('sendingSignal', {
            userIdToSendSignal,
            callerId,
            signal,
         });
      });

      return peer;
   };

   const addPeer = (incomingSignal, callerId, stream) => {
      const peer = new Peer({
         initiator: false,
         trickle: false,
         stream,
      });

      //other peer give its signal in signal object and this peer returning its own signal
      peer.on('signal', (signal) => {
         socket.current.emit('returningSignal', {
            signal,
            callerId: callerId,
         });
      });

      peer.signal(incomingSignal);
      return peer;
   };

   console.log(peers);

   return (
      <div>
         <div>
            UserId : {currentUser?.userId} <br />
            UserName: {currentUser?.userName}
         </div>
         <div className='room row'>
            <div className='videoCall'>
               <div className='videoCall_users'>
                  <div className='videoCall-grid'>
                     <video muted ref={userVideo} autoPlay playsInline />
                     {peers?.length > 0 &&
                        peers
                           .filter((el) => el.peerId !== currentUser?.userId)
                           .map((peer) => (
                              <PeopleVideo
                                 peer={peer.peer}
                                 key={peer.peerId}
                                 userName={peer.userName}
                              />
                           ))}
                  </div>
               </div>
            </div>
            <div className='chat row'>
               <div className='chat__header'>
                  <h6>Chat</h6>
               </div>

               <div className='chat__msg-container'>
                  <ul className='messages'>
                     {messages.map((message, index) => (
                        <p key={index}>
                           ({message.userName}):{message.message}
                        </p>
                     ))}
                  </ul>
               </div>

               <form
                  onSubmit={sendMessage}
                  className='chat__msg-send-container'
               >
                  <input
                     ref={messageRef}
                     type='text'
                     placeholder='Type message here...'
                  />
                  <i onClick={sendMessage} className='fa fa-paper-plane' />
               </form>
            </div>
         </div>
      </div>
   );
};

export default RoomScreen;
