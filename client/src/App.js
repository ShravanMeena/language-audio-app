import React, { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import "./styles.css";

const SERVER_URL = "http://localhost:8000"; // Replace with your actual server URL
const socket = io(SERVER_URL);

const App = () => {
  const [user, setUser] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [language, setLanguage] = useState("");
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const remoteAudio = useRef();

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            name: user.displayName,
            profilePic: user.photoURL,
            language: userData.language || "English",
            status: isInCall ? "Busy" : "Available"
          },
          { merge: true }
        );

        socket.emit("join", {
          uid: user.uid,
          name: user.displayName,
          profilePic: user.photoURL,
          language: userData.language || "English",
          status: isInCall ? "Busy" : "Available"
        });
      } else {
        setUser(null);
      }
    });

    socket.on("updateUsers", (users) => {
      setActiveUsers(users);
    });

    socket.on("incomingCall", ({ callerId, signal }) => {
      setIncomingCall({ callerId, signal });
    });

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInCall]);

  const handleBeforeUnload = (event) => {
    if (isInCall) {
      event.preventDefault();
      event.returnValue = "You are in a call. Do you want to disconnect?";
      endCall();
    }
  };

  const startCall = async (receiverId) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(stream);
    setIsInCall(true);

    const peer = new SimplePeer({ initiator: true, trickle: false, stream });
    setPeer(peer);

    peer.on("signal", (data) => {
      socket.emit("startCall", { callerId: user.uid, receiverId, signal: data });
    });

    peer.on("stream", (remoteStream) => {
      remoteAudio.current.srcObject = remoteStream;
    });

    socket.on("callAccepted", ({ signal }) => {
      peer.signal(signal);
    });
  };

  const acceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(stream);
    setIsInCall(true);

    const peer = new SimplePeer({ initiator: false, trickle: false, stream });
    setPeer(peer);

    peer.signal(incomingCall.signal);

    peer.on("signal", (data) => {
      socket.emit("acceptCall", { callerId: incomingCall.callerId, signal: data });
    });

    peer.on("stream", (remoteStream) => {
      remoteAudio.current.srcObject = remoteStream;
    });

    setIncomingCall(null);
  };

  const endCall = async () => {
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsInCall(false);
    socket.emit("endCall", { callerId: user.uid });
    await updateDoc(doc(db, "users", user.uid), { status: "Available" });
  };

  const handleSignIn = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        setUser(user);
  
        setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            name: user.displayName,
            profilePic: user.photoURL,
            language: "English",
            status: "Available",
          },
          { merge: true }
        );
  
        socket.emit("join", {
          uid: user.uid,
          name: user.displayName,
          profilePic: user.photoURL,
          language: "English",
          status: "Available",
        });
      })
      .catch((error) => console.error("Sign-in error", error));
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    socket.disconnect();
    setUser(null);
  };


  const rejectCall = () => {
    if (incomingCall) {
      socket.emit("callRejected", { callerId: incomingCall.callerId });
      setIncomingCall(null); // Clear incoming call state
      setIsInCall(false); // Ensure "End Call" button disappears
    }
  };
  
  useEffect(() => {
    socket.on("callEnded", () => {
      setPeer(null);
      setStream(null);
      setIncomingCall(null);
      setIsInCall(false); // Ensure "End Call" button disappears
    });
  
    return () => socket.off("callEnded");
  }, []);

  return (
    <div className="container">
      {user ? (
        <div>
          <h2>Welcome, {user.displayName}</h2>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
          </select>
          <button onClick={handleLogout}>Logout</button>

          {incomingCall && (
            <div className="call-notification">
              <h3>Incoming Call from {incomingCall.callerId}</h3>
              <button onClick={acceptCall}>Accept</button>
              <button onClick={() => rejectCall()}>Reject</button>
            </div>
          )}

          <h3>Active Users</h3>
          <ul>
            {activeUsers.map((u) => (
              <li key={u.uid} className={u.status === "Busy" ? "busy" : "available"}>
                <img src={u.profilePic} alt={u.name} className="avatar" />
                {u.name} ({u.language}) - {u.status}
                {u.status === "Available" && u.uid !== user.uid && (
                  <button onClick={() => startCall(u.uid)}>Call</button>
                )}
                {u.status === "Busy" && <button onClick={endCall}>End Call</button>}
              </li>
            ))}
          </ul>

          <audio ref={remoteAudio} autoPlay />
        </div>
      ) : (
        <button onClick={handleSignIn}>Login with Google</button>
      )}
    </div>
  );
};

export default App;
