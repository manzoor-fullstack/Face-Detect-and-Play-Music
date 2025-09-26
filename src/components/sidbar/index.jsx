import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { name: "Home", icon: "🏠", path: "/" },
  { name: "Search", icon: "🔍", path: "/search" },
  // { name: "Library", icon: "📚", path: "/library" },
  { name: "Playlists", icon: "🎵", path: "/playlists" },
];

function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 h-screen p-6 fixed top-0 left-0 flex flex-col">
      <h1 className="text-2xl font-bold mb-10">Music Player</h1>
      <nav>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center py-2 px-4 mb-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded transition ${
                isActive ? "bg-gray-700 text-white" : ""
              }`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
