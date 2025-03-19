import React, { useEffect } from "react";

const IncomingCall = ({ incomingCall, acceptCall, rejectCall }) => {
  useEffect(() => {
    if (incomingCall) {
      setTimeout(() => {
        rejectCall(); // Auto reject after 20 sec
      }, 20000);
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 text-center w-full max-w-md animate-fadeIn">
        <h3 className="text-lg font-semibold mb-2">Incoming Call 📞</h3>
        <div className="flex flex-col items-center mb-4">
          <img
            src={incomingCall.callerProfilePic}
            alt={incomingCall.callerName}
            className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-gray-300 shadow-md"
          />
          <p className="text-gray-800 font-bold text-lg">{incomingCall.callerName}</p>
          <p className="text-gray-600">is calling you!</p>
        </div>
        <div className="flex justify-center gap-4">
          <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg" onClick={acceptCall}>
            Accept
          </button>
          <button className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg" onClick={rejectCall}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;