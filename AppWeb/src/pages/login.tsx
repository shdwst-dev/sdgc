import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import logo from "/src/assets/LogoPI.png";
import { saveSession, updateStoredUser } from "../lib/auth";
import { postApi, putApi } from "../lib/api";

type LoginResponse = {
  token: string;
  hash?: string;
  requiere_cambio_contrasena?: boolean;
  usuario: {
    rol?: string;
    requiere_cambio_contrasena?: boolean;
    [key: string]: unknown;
  };
};

type ForgotPasswordResponse = {
  message: string;
  contrasena_temporal: string;
};

type ReplaceTemporaryPasswordResponse = {
  message: string;
  usuario: {
    rol?: string;
    requiere_cambio_contrasena?: boolean;
    [key: string]: unknown;
  };
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isTemporaryPasswordModalOpen, setIsTemporaryPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [temporaryPasswordError, setTemporaryPasswordError] = useState<string | null>(null);
  const [isUpdatingTemporaryPassword, setIsUpdatingTemporaryPassword] = useState(false);

  const navegarSegunRol = (rol?: string) => {
    if (rol === "Administrador" || rol === "Super Admin") {
      navigate("/dashboard");
    } else if (rol === "Vendedor") {
      navigate("/ventas");
    } else if (rol === "Comprador") {
      navigate("/compras-cliente");
    }
  };

  const iniciarSesion = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await postApi<LoginResponse>("/v1/auth/login", {
        email,
        contrasena: password,
      });

      saveSession(data.token, data.usuario, data.hash);
      const requiereCambio = data.requiere_cambio_contrasena || data.usuario.requiere_cambio_contrasena;

      if (requiereCambio) {
        setTemporaryPasswordError(null);
        setIsTemporaryPasswordModalOpen(true);
      } else {
        navegarSegunRol(data.usuario.rol);
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalRecuperacion = () => {
    setRecoveryEmail(email);
    setRecoveryError(null);
    setTemporaryPassword(null);
    setIsRecoveryModalOpen(true);
  };

  const solicitarContrasenaTemporal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRecoveryLoading(true);
    setRecoveryError(null);
    setTemporaryPassword(null);

    try {
      const data = await postApi<ForgotPasswordResponse>("/v1/auth/forgot-password", {
        email: recoveryEmail,
      });
      setTemporaryPassword(data.contrasena_temporal);
      setEmail(recoveryEmail);
      setPassword("");
    } catch (requestError: unknown) {
      setRecoveryError(requestError instanceof Error ? requestError.message : "No fue posible generar la contraseña temporal.");
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  const actualizarContrasenaTemporal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      setTemporaryPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setTemporaryPasswordError("La confirmacion de la contraseña no coincide.");
      return;
    }

    setIsUpdatingTemporaryPassword(true);
    setTemporaryPasswordError(null);

    try {
      const data = await putApi<ReplaceTemporaryPasswordResponse>("/v1/auth/temporary-password", {
        contrasena: newPassword,
        confirmacion_contrasena: confirmPassword,
      });

      updateStoredUser(data.usuario);
      setIsTemporaryPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      navegarSegunRol(data.usuario.rol);
    } catch (requestError: unknown) {
      setTemporaryPasswordError(requestError instanceof Error ? requestError.message : "No fue posible actualizar la contraseña.");
    } finally {
      setIsUpdatingTemporaryPassword(false);
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

          <button type="button" className="login-link-button" onClick={abrirModalRecuperacion}>
            Olvidaste tu contraseña?
          </button>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>

      {isRecoveryModalOpen ? (
        <div className="login-modal-backdrop" role="presentation" onClick={() => setIsRecoveryModalOpen(false)}>
          <div className="login-modal-card" role="dialog" aria-modal="true" aria-labelledby="recovery-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <div>
                <h2 id="recovery-modal-title">Recuperar acceso</h2>
                <p>Escribe tu correo para validar tu cuenta y generar una contraseña temporal.</p>
              </div>
              <button type="button" className="login-modal-close" onClick={() => setIsRecoveryModalOpen(false)}>
                Cerrar
              </button>
            </div>

            <form className="login-modal-form" onSubmit={solicitarContrasenaTemporal}>
              {recoveryError ? <p className="form-message form-message-error">{recoveryError}</p> : null}
              <div className="form-group">
                <label htmlFor="recovery-email">Correo electrónico</label>
                <input
                  id="recovery-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>

              {temporaryPassword ? (
                <div className="login-temporary-password-box">
                  <strong>Contraseña temporal generada</strong>
                  <span>{temporaryPassword}</span>
                  <p>Usa esta contraseña para iniciar sesion. Al entrar, te pediremos definir una nueva.</p>
                </div>
              ) : null}

              <button type="submit" disabled={isRecoveryLoading}>
                {isRecoveryLoading ? "Validando..." : "Generar contraseña temporal"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isTemporaryPasswordModalOpen ? (
        <div className="login-modal-backdrop">
          <div className="login-modal-card" role="dialog" aria-modal="true" aria-labelledby="temporary-password-title">
            <div className="login-modal-header">
              <div>
                <h2 id="temporary-password-title">Nueva contraseña requerida</h2>
                <p>Entraste con una contraseña temporal. Antes de continuar, define una nueva contraseña.</p>
              </div>
            </div>

            <form className="login-modal-form" onSubmit={actualizarContrasenaTemporal}>
              {temporaryPasswordError ? <p className="form-message form-message-error">{temporaryPasswordError}</p> : null}

              <div className="form-group">
                <label htmlFor="new-password">Nueva contraseña</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirmar contraseña</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  required
                />
              </div>

              <button type="submit" disabled={isUpdatingTemporaryPassword}>
                {isUpdatingTemporaryPassword ? "Actualizando..." : "Guardar nueva contraseña"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
