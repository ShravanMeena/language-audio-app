import { useState, useRef } from "react";
import SimplePeer from "simple-peer";

const useCallHandler = (socket, user) => {
  const [peer, setPeer] = useState(null);
  const [stream, setStream] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const remoteAudio = useRef();

  const startCall = async (receiverId) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(stream);
    setIsInCall(true);
    setCurrentCall(receiverId);

    const newPeer = new SimplePeer({ initiator: true, trickle: false, stream });
    setPeer(newPeer);

    newPeer.on("signal", (data) => {
      socket.emit("startCall", {
        callerId: user.uid,
        callerName: user.displayName,
        receiverId,
        signal: data,
      });
    });

    newPeer.on("stream", (remoteStream) => {
      remoteAudio.current.srcObject = remoteStream;
    });

    socket.on("callAccepted", ({ signal }) => {
      newPeer.signal(signal);
    });
  };

  const endCall = () => {
    if (peer) peer.destroy();
    if (stream) stream.getTracks().forEach((track) => track.stop());

    setPeer(null);
    setStream(null);
    setIsInCall(false);
    setCurrentCall(null);
    socket.emit("endCall", { callerId: user.uid });
  };

  return { startCall, endCall, isInCall, currentCall, remoteAudio };
};

export default useCallHandler;