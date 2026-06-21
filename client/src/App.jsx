import { Routes, Route, Navigate } from 'react-router-dom';
import { LangProvider } from './contexts/LangContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import ClaimFlow from './pages/ClaimFlow';
import ClerkPortal from './pages/ClerkPortal';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('idlink_token');
  const staff = JSON.parse(localStorage.getItem('idlink_staff') || 'null');
  if (!token || !staff) return <Navigate to="/clerk" replace />;
  if (requiredRole && staff.role !== requiredRole) return <Navigate to="/clerk/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <LangProvider>
    <Routes>
      {/* Full-screen staff consoles (own sidebar shell, no public header) */}
      <Route
        path="/admin"
        element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
      />
      <Route path="/clerk" element={<ClerkPortal />} />
      <Route
        path="/clerk/dashboard"
        element={<ProtectedRoute><ClerkPortal /></ProtectedRoute>}
      />

      {/* Public pages share the top-header layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/claim/:documentId" element={<ClaimFlow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </LangProvider>
  );
}
