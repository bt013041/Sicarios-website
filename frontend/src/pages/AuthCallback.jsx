import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      login(token).then(() => navigate("/app"));
    } else {
      navigate("/");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-cartel-textsec font-mono">
      Autentificare...
    </div>
  );
}
