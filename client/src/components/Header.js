import React from "react";

const Header = ({ companyName = "My Company", user, handleLogout }) => {
  return (
      <header className="fixed top-0 left-0 w-full h-16 flex justify-between items-center bg-white shadow px-6 z-50">
      {/* Left - Company Name */}
      <h1 className="text-xl font-bold text-gray-800">{companyName}</h1>

      {/* Right - User Info & Logout */}
      {user && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-10 h-10 rounded-full border border-gray-300"
            />
            <span className="font-medium text-gray-700">{user.displayName}</span>
          </div>
          <button
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
