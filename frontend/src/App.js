import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Task from "@/pages/Task";
import Pontaj from "@/pages/Pontaj";
import Jafuri from "@/pages/Jafuri";
import Loterie from "@/pages/Loterie";
import Fonduri from "@/pages/Fonduri";
import Rapoarte from "@/pages/Rapoarte";
import Membri from "@/pages/Membri";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cartel-red" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-screen bg-cartel-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function Guard({ module, children }) {
  const { canAccess } = useAuth();
  if (!canAccess(module)) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <div className="App dark">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/app" element={<ProtectedLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="task" element={<Guard module="task"><Task /></Guard>} />
              <Route path="pontaj" element={<Pontaj />} />
              <Route path="jafuri" element={<Guard module="jafuri"><Jafuri /></Guard>} />
              <Route path="loterie" element={<Loterie />} />
              <Route path="fonduri" element={<Fonduri />} />
              <Route path="rapoarte" element={<Rapoarte />} />
              <Route path="membri" element={<Membri />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
