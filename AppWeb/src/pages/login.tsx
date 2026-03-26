import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import logo from "/src/assets/LogoPI.png";
import { saveSession } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iniciarSesion = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentHost = window.location.hostname;
      const API_URL = `http://${currentHost}:8000/api/v1/auth/login`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email: email,
          contrasena: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      saveSession(data.token, data.usuario, data.hash);

      if (data.usuario.rol === "Administrador") {
        navigate("/dashboard");
      } else if (data.usuario.rol === "Vendedor") {
        navigate("/ventas");
      } else if (data.usuario.rol === "Comprador") {
        navigate("/compras");
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <img src={logo} alt="Logo" className="logo-img" />
          </div>
          <h1>Iniciar sesión</h1>
          <p className="description">Introduce tus datos para ingresar</p>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            iniciarSesion();
          }}
        >
          {error ? <p className="form-message form-message-error">{error}</p> : null}

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
