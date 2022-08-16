import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

function generateUserName(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const RoomScreen = (props) => {
  const { roomId } = useParams();
  const socket = useRef();
  const messageRef = useRef();
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    socket.current = io.connect("http://localhost:8000");

    const user = generateUserName(5);
    setCurrentUser(user);

    socket.current.emit("user-joined-room", {
      userName: user,
      roomId,
    });

    socket.current.on("fulled-room", () => {
      alert("Full room rồi");
      return;
    });

    socket.current.on("userInRoom", (userInThisRoom) => {
      setUsersInRoom(userInThisRoom);
    });

    socket.current.on("userLeft", ({ leavedUser, existedUserInRoom }) => {
      const onlineUserInRoom = existedUserInRoom.filter(
        (el) => el.userId !== leavedUser.userId
      );
      setUsersInRoom(onlineUserInRoom);
      console.log(`User ${leavedUser.userName} left the room`);
    });

    socket.current.on("sendMessageToClient", (payload) => {
      console.log(payload);
      setMessages((prev) => [...prev, payload]);
    });
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (socket.current) {
      socket.current.emit("sendMessageToServer", {
        roomId,
        message: messageRef.current.value,
        currentUser
      });
      messageRef.current.value = "";
    }
  };

  return (
    <div>
      RoomScreen {usersInRoom.length} users in room
      <div className="room row">
        <div className="videoCall"></div>
        <div className="chat row">
          <div className="chat__header">
            <h6>Chat</h6>
          </div>

          <div className="chat__msg-container">
            <ul className="messages">
              {messages.map((message, index) => (
                <p key={index}>
                  ({message.userName}):{message.message}
                </p>
              ))}
            </ul>
          </div>

          <form onSubmit={sendMessage} className="chat__msg-send-container">
            <input
              ref={messageRef}
              type="text"
              placeholder="Type message here..."
            />
            <i onClick={sendMessage} className="fa fa-paper-plane" />
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomScreen;
