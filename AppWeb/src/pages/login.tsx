import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import logo from "/src/assets/LogoPI.png";

type Rol = "Administrador" | "Vendedor" | "Comprador" | "";

export default function Login() {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>("");

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

  const iniciarSesion = () => {
    if (!rolSeleccionado) {
      alert("Por favor, selecciona un perfil antes de iniciar sesión.");
      return;
    }

    localStorage.setItem("rolUsuario", rolSeleccionado);

    if (rolSeleccionado === "Administrador") {
      navigate("/dashboard");
    } else if (rolSeleccionado === "Vendedor") {
      navigate("/ventas");
    } else if (rolSeleccionado === "Comprador") {
      navigate("/compras");
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
            <input id="email" type="email" placeholder="email@example.com" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="••••••••" />
          </div>

          <button type="submit">
            {rolSeleccionado ? `Iniciar sesión como ${rolSeleccionado}` : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}