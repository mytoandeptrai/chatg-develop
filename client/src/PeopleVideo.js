import React, { useEffect, useRef } from 'react';

const PeopleVideo = ({ peer, userName }) => {
   const userVideoRef = useRef();

   useEffect(() => {
      peer.on('stream', (stream) => {
         console.log(
            '🚀 ~ file: PeopleVideo.js ~ line 10 ~ peer.peer.on ~ stream',
            stream
         );
         userVideoRef.current.srcObject = stream;
      });
   }, [peer]);

   return (
      <div>
         <p>UserName: {userName}</p>
         <video playsInline autoPlay ref={userVideoRef} />;
      </div>
   );
};

export default PeopleVideo;
