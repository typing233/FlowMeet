import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import PrivateRoute from './components/Layout/PrivateRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EventTypes from './pages/EventTypes';
import EventTypesForm from './pages/EventTypesForm';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';
import PublicBooking from './pages/PublicBooking';
import AIAssistant from './pages/AIAssistant';
import BookingTimeline from './pages/BookingTimeline';

function App() {
  const location = useLocation();
  const isPublicBookingPage = location.pathname.startsWith('/book/');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPublicBookingPage && <Navbar />}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/event-types" element={
          <PrivateRoute>
            <EventTypes />
          </PrivateRoute>
        } />
        
        <Route path="/event-types/new" element={
          <PrivateRoute>
            <EventTypesForm />
          </PrivateRoute>
        } />
        
        <Route path="/event-types/:id/edit" element={
          <PrivateRoute>
            <EventTypesForm />
          </PrivateRoute>
        } />
        
        <Route path="/bookings" element={
          <PrivateRoute>
            <Bookings />
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        } />
        
        <Route path="/ai-assistant" element={
          <PrivateRoute>
            <AIAssistant />
          </PrivateRoute>
        } />
        
        <Route path="/booking-timeline" element={
          <PrivateRoute>
            <BookingTimeline />
          </PrivateRoute>
        } />
        
        <Route path="/book/:userId/:slug" element={<PublicBooking />} />
        <Route path="/book/:userId" element={<PublicBooking />} />
      </Routes>
    </div>
  );
}

export default App;
