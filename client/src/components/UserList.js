import React from "react";

const UserList = ({ activeUsers, user, startCall }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mt-6 mb-4">Active Users</h3>
      <div className="max-h-64 overflow-y-auto">
        <ul className="space-y-4">
          {activeUsers
            .filter((u) => u.uid !== user.uid) // Exclude logged-in user
            .map((u) => (
              <li
                key={u.uid}
                className={`flex justify-between items-center p-4 rounded-lg shadow-sm ${
                  u.status === "Busy" ? "border-l-4 border-red-500 bg-gray-50" : "border-l-4 border-green-500 bg-white"
                }`}
              >
                <div className="flex items-center">
                  <img src={u.profilePic} alt={u.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                  <div>
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.language}</div>
                  </div>
                </div>
                <div>
                  {u.status === "Available" && (
                    <button className="bg-green-500 text-white py-1 px-3 rounded-lg" onClick={() => startCall(u.uid)}>
                      Call
                    </button>
                  )}
                  {u.status === "Busy" && <span className="text-red-500">Busy</span>}
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default UserList;