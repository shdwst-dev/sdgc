import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import logo from "/src/assets/LogoPI.png";

type Rol = "Administrador" | "Vendedor" | "Comprador" | "";

export default function Login() {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    {
      title: "Administrador",
      subtitle: "Acceso total al sistema",
      detail: "Todos los permisos",
      icon: "🛡️",
    },
    {
      title: "Vendedor",
      subtitle: "Operador de venta",
      detail: "Vender y desplegar reportes",
      icon: "🛒",
    },
    {
      title: "Comprador",
      subtitle: "Comprar",
      detail: "Ver y pedir productos",
      icon: "📦",
    },
  ];

  const iniciarSesion = async () => {
    if (!rolSeleccionado) {
      alert("Por favor selecciona un rol");
      return;
    }

    setIsLoading(true);
    try {
      // Usar la IP del error si es que el frontend también está corriendo en esa IP
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

      localStorage.setItem("token", data.token);
      localStorage.setItem("rolUsuario", data.usuario.rol);

      if (data.usuario.rol === "Administrador") {
        navigate("/dashboard");
      } else if (data.usuario.rol === "Vendedor") {
        navigate("/ventas");
      } else if (data.usuario.rol === "Comprador") {
        navigate("/compras");
      }
    } catch (error: any) {
      alert(error.message);
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
          <h1>Inicio de sesión</h1>
          <p className="description">Selecciona tu rol para continuar</p>
        </div>

        <div className="role-section">
          <label>Selecciona el rol</label>
          <div className="roles-grid">
            {roles.map((role) => (
              <button
                key={role.title}
                type="button"
                className={`role-card ${rolSeleccionado === role.title ? "role-card-active" : ""}`}
                onClick={() => setRolSeleccionado(role.title as Rol)}
              >
                <div className="role-icon">{role.icon}</div>
                <h3>{role.title}</h3>
                <p>{role.subtitle}</p>
                <p>{role.detail}</p>
              </button>
            ))}
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            iniciarSesion();
          }}
        >
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
            {isLoading ? "Cargando..." : (rolSeleccionado ? `Iniciar sesión como ${rolSeleccionado}` : "Iniciar sesión")}
          </button>
        </form>
      </div>
    </div>
  );
}