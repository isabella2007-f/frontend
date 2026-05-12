// authService.js
export const login = (email, password) => {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.correo === email && u.password === password);

  if (user) {
    if (!user.estado) {
      throw new Error("Su cuenta está desactivada. Contacte al administrador.");
    }
    localStorage.setItem("session", JSON.stringify(user)); // Use localStorage to keep user logged in during refresh, but we'll clear it if needed.
    // Wait, the user said "al iniciar el proyecto". 
    // If I want it to be NOT logged in on first start, I can clear it in AppRouter if not already cleared.
    
    // Actually, I'll use sessionStorage for the SESSION but keep users in localStorage.
    sessionStorage.setItem("session", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("session-changed"));
    return user;
  }
  throw new Error("Credenciales inválidas");
};

export const logout = () => {
  sessionStorage.removeItem("session");
  localStorage.removeItem("session"); // Clear both just in case
  window.dispatchEvent(new CustomEvent("session-changed"));
  window.location.href = "/login";
};

export const getUser = () => {
  const session = sessionStorage.getItem("session") || localStorage.getItem("session");
  return session ? JSON.parse(session) : null;
};

export const isAuthenticated = () => {
  const session = sessionStorage.getItem("session") || localStorage.getItem("session");
  if (!session) return false;

  try {
    const parsed = JSON.parse(session);
    return parsed !== null;
  } catch {
    return false;
  }
};;

export const hasRole = (role) => {
  const user = getUser();
  return user && user.rol === role;
};
