import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminDoctorsPage from './pages/AdminDoctorsPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

