import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../layout";
import Home from "../components/home";
import Playlist from "../components/playlist";
import SearchComponent from "../components/search";

function Router() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/playlists" element={<Playlist />} />
            <Route path="/search" element={<SearchComponent />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default Router;
