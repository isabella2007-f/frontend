// authService.js
export const login = (email, password) => {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.correo === email && u.password === password);

  if (user) {
    if (!user.estado) {
      throw new Error("Su cuenta está desactivada. Contacte al administrador.");
    }
    localStorage.setItem("session", JSON.stringify(user));
    return user;
  }
  throw new Error("Credenciales inválidas");
};

export const logout = () => {
  localStorage.removeItem("session");
  window.location.href = "/login";
};

export const getUser = () => {
  const session = localStorage.getItem("session");
  return session ? JSON.parse(session) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("session");
};

export const hasRole = (role) => {
  const user = getUser();
  return user && user.rol === role;
};
