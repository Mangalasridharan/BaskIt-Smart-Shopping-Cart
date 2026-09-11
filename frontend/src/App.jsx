import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing/Landing";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import Inventory from "./pages/Admin/Inventory";

const routes = (
  <Router>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/admin" element={<Inventory />} />
      <Route path="/inventory" element={<Inventory />} />
      {/* Fallback unknown paths to Landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

const App = () => {
  return (
    <ThemeProvider>
      {routes}
    </ThemeProvider>
  );
};
export default App;