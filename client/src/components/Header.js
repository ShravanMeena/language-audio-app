import React from "react";

const Header = ({ user, handleLogout }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">Welcome, {user.displayName}</h2>
      <button
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
};

export default Header;