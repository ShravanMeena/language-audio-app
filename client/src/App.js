import React, { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import io from "socket.io-client";
import SimplePeer from "simple-peer";

const SERVER_URL = "https://c08e-2409-40d0-31-90cf-4859-d4cd-9624-e368.ngrok-free.app/";
const socket = io(SERVER_URL);

const App = () => {
  const [user, setUser] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [language, setLanguage] = useState("English");
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const remoteAudio = useRef();

  const ringtone = new Audio("./ringtone.mp3"); // Replace with the correct path to your ringtone

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
            status: isInCall ? "Busy" : "Available",
          },
          { merge: true }
        );

        socket.emit("join", {
          uid: user.uid,
          name: user.displayName,
          profilePic: user.photoURL,
          language: userData.language || "English",
          status: isInCall ? "Busy" : "Available",
        });
      } else {
        setUser(null);
      }
    });

    socket.on("updateUsers", (users) => {
      setActiveUsers(users);
    });

    // socket.on("incomingCall", ({ callerId, signal }) => {
    //   setIncomingCall({ callerId, signal });
    // });
    socket.on("incomingCall", ({ callerId, callerName, callerProfilePic, signal }) => {
      setIncomingCall({ callerId, callerName, callerProfilePic, signal });
    });


    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInCall]);

  useEffect(() => {
    if (incomingCall) {
      ringtone.play();  // Play ringtone when there's an incoming call
    }
  }, [incomingCall]);  // Trigger when incoming call state changes
  
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
      // socket.emit("startCall", { callerId: user.uid, receiverId, signal: data });
      socket.emit("startCall", {
        callerId: user.uid,
        callerName: user.displayName,
        callerProfilePic: user.photoURL,
        receiverId,
        signal: data
      });

    });

    peer.on("stream", (remoteStream) => {
      remoteAudio.current.srcObject = remoteStream;
    });

    socket.on("callAccepted", ({ signal }) => {
      peer.signal(signal);
    });
  };

  const acceptCall = async () => {

    ringtone.pause();
    ringtone.currentTime = 0; 

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
    ringtone.pause();
    ringtone.currentTime = 0; 

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

    ringtone.pause();
    ringtone.currentTime = 0; 

    if (incomingCall) {
      socket.emit("callRejected", { callerId: incomingCall.callerId });
      setIncomingCall(null);
      setIsInCall(false);
    }
  };

  useEffect(() => {
    socket.on("callEnded", () => {
      setPeer(null);
      setStream(null);
      setIncomingCall(null);
      setIsInCall(false);
    });

    return () => socket.off("callEnded");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
      {user ? (
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Welcome, {user.displayName}</h2>
            <button
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-gray-600 mb-2">Select Language</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>
          </div>

          {incomingCall && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              {console.log(incomingCall, 'incoming call')}
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center w-full max-w-md animate-fadeIn">
                <h3 className="text-lg font-semibold mb-2">Incoming Call 📞</h3>
                <div className="flex flex-col items-center mb-4">
                  <img
                    src={incomingCall.callerProfilePic}
                    alt={incomingCall.callerName}
                    className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-gray-300 shadow-md"
                  />

                  <p className="text-gray-800 font-bold text-lg">
                    {incomingCall.callerName}
                  </p>
                  <p className="text-gray-600">is calling you!</p>
                </div>
                {/* <p className="text-gray-600 mb-4">{incomingCall.callerName} is calling you!</p> */}
                <div className="flex justify-center gap-4">
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
                    onClick={acceptCall}
                  >
                    Accept
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
                    onClick={rejectCall}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold mt-6 mb-4">Active Users</h3>
          <div className="max-h-64 overflow-y-auto">
            <ul className="space-y-4">
              {activeUsers.map((u) => (
                <li
                  key={u.uid}
                  className={`flex justify-between items-center p-4 rounded-lg shadow-sm ${u.status === "Busy" ? "border-l-4 border-red-500 bg-gray-50" : "border-l-4 border-green-500 bg-white"}`}
                >
                  <div className="flex items-center">
                    <img
                      src={u.profilePic}
                      alt={u.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.language}</div>
                    </div>
                  </div>
                  <div>
                    {u.status === "Available" && u.uid !== user.uid && (
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-lg"
                        onClick={() => startCall(u.uid)}
                      >
                        Call
                      </button>
                    )}
                    {u.status === "Busy" && (
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg"
                        onClick={endCall}
                      >
                        End Call
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <audio ref={remoteAudio} autoPlay />
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Welcome to Voice Chat App</h2>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
            onClick={handleSignIn}
          >
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
