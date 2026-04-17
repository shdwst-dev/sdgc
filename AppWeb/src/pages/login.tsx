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

type RegisterBuyerResponse = {
  message: string;
};

type BuyerRegisterForm = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  email: string;
  contrasena: string;
  estado: string;
  municipio: string;
  colonia: string;
  cp: string;
  calle: string;
  num_ext: string;
  num_int: string;
};

const emptyBuyerRegisterForm: BuyerRegisterForm = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  telefono: "",
  email: "",
  contrasena: "",
  estado: "",
  municipio: "",
  colonia: "",
  cp: "",
  calle: "",
  num_ext: "",
  num_int: "",
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
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerBuyerForm, setRegisterBuyerForm] = useState<BuyerRegisterForm>(emptyBuyerRegisterForm);
  const [registerBuyerError, setRegisterBuyerError] = useState<string | null>(null);
  const [registerBuyerSuccess, setRegisterBuyerSuccess] = useState<string | null>(null);
  const [isRegisteringBuyer, setIsRegisteringBuyer] = useState(false);

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
      setError(submitError instanceof Error ? submitError.message : "No fue posible iniciar sesión.");
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

  const abrirModalRegistro = () => {
    setRegisterBuyerError(null);
    setRegisterBuyerSuccess(null);
    setRegisterBuyerForm((actual) => ({
      ...emptyBuyerRegisterForm,
      email: email || actual.email,
    }));
    setIsRegisterModalOpen(true);
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

  const registrarComprador = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRegisteringBuyer(true);
    setRegisterBuyerError(null);
    setRegisterBuyerSuccess(null);

    try {
      const response = await postApi<RegisterBuyerResponse>("/v1/auth/register-buyer", {
        nombre: registerBuyerForm.nombre,
        apellido_paterno: registerBuyerForm.apellido_paterno,
        apellido_materno: registerBuyerForm.apellido_materno || null,
        telefono: registerBuyerForm.telefono,
        email: registerBuyerForm.email,
        contrasena: registerBuyerForm.contrasena,
        estado: registerBuyerForm.estado,
        municipio: registerBuyerForm.municipio,
        colonia: registerBuyerForm.colonia,
        cp: registerBuyerForm.cp ? Number(registerBuyerForm.cp) : null,
        calle: registerBuyerForm.calle,
        num_ext: Number(registerBuyerForm.num_ext),
        num_int: registerBuyerForm.num_int ? Number(registerBuyerForm.num_int) : null,
      });

      setRegisterBuyerSuccess(response.message);
      setEmail(registerBuyerForm.email);
      setPassword("");
      setRegisterBuyerForm(emptyBuyerRegisterForm);
    } catch (requestError: unknown) {
      setRegisterBuyerError(requestError instanceof Error ? requestError.message : "No fue posible registrar la cuenta.");
    } finally {
      setIsRegisteringBuyer(false);
    }
  };

  return (
    <div className="pagina-inicio-sesion">
      <div className="tarjeta-inicio-sesion">
        <div className="encabezado-inicio-sesion">
          <div className="circulo-logo">
            <img src={logo} alt="Logo" className="logo-imagen" />
          </div>
          <h1>Iniciar sesión</h1>
          <p className="descripcion-inicio-sesion">Introduce tus datos para ingresar</p>
        </div>

        <form
          className="formulario-inicio-sesion"
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

          <button type="button" className="boton-enlace-inicio-sesion" onClick={abrirModalRecuperacion}>
            ¿Olvidaste tu contraseña?
          </button>

          <button type="button" className="boton-enlace-inicio-sesion boton-enlace-inicio-sesion-left" onClick={abrirModalRegistro}>
            Crear cuenta
          </button>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>

      {isRecoveryModalOpen ? (
        <div className="fondo-modal-inicio-sesion" role="presentation" onClick={() => setIsRecoveryModalOpen(false)}>
          <div className="tarjeta-modal-inicio-sesion" role="dialog" aria-modal="true" aria-labelledby="recovery-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="encabezado-modal-inicio-sesion">
              <div>
                <h2 id="recovery-modal-title">Recuperar acceso</h2>
                <p>Escribe tu correo para validar tu cuenta y generar una contraseña temporal.</p>
              </div>
              <button type="button" className="boton-cerrar-modal-inicio-sesion" onClick={() => setIsRecoveryModalOpen(false)}>
                Cerrar
              </button>
            </div>

            <form className="formulario-modal-inicio-sesion" onSubmit={solicitarContrasenaTemporal}>
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
                <div className="caja-contrasena-temporal">
                  <strong>Contraseña temporal generada</strong>
                  <span>{temporaryPassword}</span>
                  <p>Usa esta contraseña para iniciar sesión. Al entrar, te pediremos definir una nueva.</p>
                </div>
              ) : null}

              <button type="submit" disabled={isRecoveryLoading}>
                {isRecoveryLoading ? "Validando..." : "Generar contraseña temporal"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isRegisterModalOpen ? (
        <div className="fondo-modal-inicio-sesion" role="presentation" onClick={() => setIsRegisterModalOpen(false)}>
          <div className="tarjeta-modal-inicio-sesion tarjeta-modal-registro" role="dialog" aria-modal="true" aria-labelledby="register-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="encabezado-modal-inicio-sesion">
              <div>
                <h2 id="register-modal-title">Registro de comprador</h2>
                <p>Crea una cuenta nueva. El registro siempre se genera con rol Comprador.</p>
              </div>
              <button type="button" className="boton-cerrar-modal-inicio-sesion" onClick={() => setIsRegisterModalOpen(false)}>
                Cerrar
              </button>
            </div>

            <form className="formulario-modal-inicio-sesion" onSubmit={registrarComprador}>
              {registerBuyerError ? <p className="form-message form-message-error">{registerBuyerError}</p> : null}
              {registerBuyerSuccess ? <p className="form-message form-message-success">{registerBuyerSuccess}</p> : null}

              <div className="rejilla-registro-comprador">
                <div className="form-group">
                  <label htmlFor="register-nombre">Nombre</label>
                  <input id="register-nombre" value={registerBuyerForm.nombre} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, nombre: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-apellido-paterno">Apellido paterno</label>
                  <input id="register-apellido-paterno" value={registerBuyerForm.apellido_paterno} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, apellido_paterno: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-apellido-materno">Apellido materno</label>
                  <input id="register-apellido-materno" value={registerBuyerForm.apellido_materno} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, apellido_materno: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="register-telefono">Teléfono</label>
                  <input id="register-telefono" value={registerBuyerForm.telefono} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, telefono: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">Correo</label>
                  <input id="register-email" type="email" value={registerBuyerForm.email} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Contraseña</label>
                  <input id="register-password" type="password" value={registerBuyerForm.contrasena} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, contrasena: e.target.value }))} minLength={8} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-estado">Estado</label>
                  <input id="register-estado" value={registerBuyerForm.estado} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, estado: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-municipio">Municipio</label>
                  <input id="register-municipio" value={registerBuyerForm.municipio} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, municipio: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-colonia">Colonia</label>
                  <input id="register-colonia" value={registerBuyerForm.colonia} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, colonia: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-cp">Código postal</label>
                  <input id="register-cp" inputMode="numeric" value={registerBuyerForm.cp} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, cp: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="register-calle">Calle</label>
                  <input id="register-calle" value={registerBuyerForm.calle} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, calle: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-num-ext">Número exterior</label>
                  <input id="register-num-ext" inputMode="numeric" value={registerBuyerForm.num_ext} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, num_ext: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-num-int">Número interior</label>
                  <input id="register-num-int" inputMode="numeric" value={registerBuyerForm.num_int} onChange={(e) => setRegisterBuyerForm((actual) => ({ ...actual, num_int: e.target.value }))} />
                </div>
              </div>

              <button type="submit" disabled={isRegisteringBuyer}>
                {isRegisteringBuyer ? "Registrando..." : "Crear cuenta"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isTemporaryPasswordModalOpen ? (
        <div className="fondo-modal-inicio-sesion">
          <div className="tarjeta-modal-inicio-sesion" role="dialog" aria-modal="true" aria-labelledby="temporary-password-title">
            <div className="encabezado-modal-inicio-sesion">
              <div>
                <h2 id="temporary-password-title">Nueva contraseña requerida</h2>
                <p>Entraste con una contraseña temporal. Antes de continuar, define una nueva contraseña.</p>
              </div>
            </div>

            <form className="formulario-modal-inicio-sesion" onSubmit={actualizarContrasenaTemporal}>
              {temporaryPasswordError ? <p className="form-message form-message-error">{temporaryPasswordError}</p> : null}

              <div className="form-group">
                <label htmlFor="new-password">Nueva contraseña</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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
