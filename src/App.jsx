import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Registration page — saves data to Supabase */}
      <Route path="/register" element={<Register />} />
      {/* Profile page — only accessible when logged in */}
      <Route path="/" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
