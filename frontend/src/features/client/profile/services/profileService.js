// profileService.js — alineado con tabla Usuarios en BD

export const getCurrentUser = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session) : null;
};

export const updateUser = (updatedData) => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No hay sesión activa');

  // Campos protegidos — nunca se sobreescriben desde el perfil
  const { cedula, tipoDocumento, nombre, apellidos, rol, estado, ...editable } = updatedData;

  const users = JSON.parse(localStorage.getItem('users') || '[]');

  const updatedUsers = users.map(u =>
    u.cedula === currentUser.cedula
      ? { ...u, ...editable }
      : u
  );

  localStorage.setItem('users', JSON.stringify(updatedUsers));

  const newProfile = { ...currentUser, ...editable };
  localStorage.setItem('session', JSON.stringify(newProfile));
  sessionStorage.setItem('session', JSON.stringify(newProfile));

  return newProfile;
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};