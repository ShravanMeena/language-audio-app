import React from "react";
import Header from "../components/Header";

const Layout = ({ children, user, handleLogout }) => {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      {/* Header fixed height */}
      <Header
        companyName="Voice Chat App"
        user={user}
        handleLogout={handleLogout}
      />

      {/* Content below header */}
      <main className="flex-1 overflow-auto pt-16 p-4 flex justify-center items-start">
        <div className="w-full max-w-xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
