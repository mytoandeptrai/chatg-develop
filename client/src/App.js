import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 50%;
`;

function App() {
  const [yourID, setYourID] = useState('');
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(); // to keep signal data of caller
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = io.connect('/');
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

    socket.current.on('yourID', (id) => {
      setYourID(id);
    });
    socket.current.on('allUsers', (users) => {
      setUsers(users);
    });

    socket.current.on('hey', (data) => {
      // this runs when somebody calls us and we accept the call (receiving call at our end)
      // we will receive the signal data from the caller
      setReceivingCall(true); // whether or not to render the message saying hey you are getting call
      setCaller(data.from);
      // setting the caller signal which will handle the fact that we're being called,
      // this is not yet handling the fact that we're accepting a call
      // this is simply to notify us that we are in fact receiving a call and
      // ####
      // we will handle actual call accept handling when the button is clicked.
      // ie. by running acceptCall()
      // ####
      setCallerSignal(data.signal);
    });
  }, []);

  function callPeer(id) {
    // this peer is the one who is initiating the call
    // the receiver peer will be defined inside acceptCall()
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // Fired when the peer wants to send signaling (offer,answer, or ice candidate data) data to the remote peer (call accept garne user)
    // that peer will also emit the `signal` event which can be used in call request garne user
    // the peer signals what do you want me to do what I'm actually signaling
    // and, so in this case we're capturing that signal data, sending it down to the server
    // and the server had to go to the person that we're trying to make the phone call to or rather the video call to
    // and then that other people that be able to accept that data and then create the handshake
    // ####
    // this `signal` is handled in the peer end who accepts the calls
    // we are emmitting event for the receiver's end peer and will handle this event in receiver (who accept the call) end.
    peer.on('signal', (data) => {
      socket.current.emit('callUser', {
        to: id,
        from: yourID,
        signalData: data,
      });
    });

    // Received a remote video stream, which can be displayed in partner video element tag.
    // once we start receiving stream from other peer, stream represents the incomming video stream
    peer.on('stream', (stream) => {
      // checking if partner's video is already rendered, if rendered then we will add the partner video stream
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on('callAccepted', (signal) => {
      setCallAccepted(true);
      // got signal in return, because, both of the sender and reciever have to send the signal back each other so that they
      // can actually create the handshake
      // so the caller has to accept the handshake from the person who received
      // When A calls B, A sends signal to B, B has to accept that signal but B has to also send the signal back to A so that A can accept that
      // now we actually have the handshake
      //####
      // `callAccepted` event (socket.io) will send signal data of remote user's (call accept garne user ko) signal data
      // and current peer (call request garne user) will call peer.signal() on that signal data (only after the call reciever accepts for the call)
      // The data will encapsulate a webrtc offer, answer, or ice candidate.
      // These messages help the peers to eventually establish a direct connection to each other.
      //####
      peer.signal(signal);
      // particular peer has accepted the incomming signal that has been sent from the person who's receiving the call.
    });
  }

  function acceptCall() {
    setCallAccepted(true);
    // this peer is the one who receives the call
    // the peer for initiating the call is defined in callPeer()
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    // everytime we define a peer, we need to emit the `signal` event
    peer.on('signal', (data) => {
      // we will send the signaling data back to the server to
      // go back to the person that we're trying to accept a call from (call request garne user)
      // because, again, in order for us to have a proper handshake
      // each peer must accept the other peer signal to have that proper sort of tight loop
      // that you have the proper handshake.
      // to: the person who called us which we have set in our state as caller
      socket.current.emit('acceptCall', { signal: data, to: caller });
    });

    // again in this case partnerVideo represents the other person
    // ie. now we are comming from the perspective of we are receiving caller
    // in other words, partnerVideo represents, person who's calling us
    peer.on('stream', (stream) => {
      // if (partnerVideo.current) partnerVideo.current.srcObject = stream;
      console.log('partnerVideo.current', partnerVideo.current);
      console.log('stream', stream);
      console.log('partnerVideo', partnerVideo);
      partnerVideo.current.srcObject = stream;
    });

    // when a person receives a call they are signaling on the call that they've
    // on the signal they received
    // they are also setting back to the server their own signal
    // which will then come back to `socket.current.on('callAccepted', (signal) => {} `
    // and receive that `callerSignal` and then this peer can signal on that
    peer.signal(callerSignal);
  }

  ////// ####################
  // call garne user le peer.on('signal') ma aafno signal record rakhxa ra
  // callUser() function ma peer.signal(data) garda aaune data vaneko call accept garne user ko hunxa
  // yeha, callUser() ma peer.signal(data) lai socket.io ko emmitted event 'callAccepted' huda execute gariyeko xa

  // same in call receive garne user, peer.on('sginal') ma aafno signal record rakhxa ra,
  // acceptCall() ko peer.signal(data) ma hune data vaneko call garne user ko signal data ho
  // call garne user ko signal data state banayera rakhiyeko xa 'callerSignal'
  //
  // jun bela first time call request garxam, tyo bela 'callUser' event trigger hunxa (socket.io ma)
  // ra tyo event handle garda 'hey' event trigger hunxa (targetter call accept garne user ko lagi)
  // once the call accept garne user le 'hey' event thaha pauxa, tei bela we set the `callerSignal`.
  ////// ####################

  let UserVideo;
  if (stream) {
    UserVideo = <Video playsInline muted ref={userVideo} autoPlay />;
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = <Video playsInline ref={partnerVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
      </div>
    );
  }
  return (
    <Container>
      <Row>
        {UserVideo}
        {PartnerVideo}
      </Row>
      <Row>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return (
            <button onClick={() => callPeer(key)} key={key}>
              Call {key}
            </button>
          );
        })}
      </Row>
      <Row>{incomingCall}</Row>
    </Container>
  );
}

export default App;
