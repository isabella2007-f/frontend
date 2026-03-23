// src/features/client/profile/services/profileService.ts

export interface UserProfile {
  id?: number;
  nombre: string;
  documento: string; // Solo lectura
  correo: string;
  telefono: string;
  direccion: string;
  estado: boolean;
  rol: string;
  password?: string;
  fotoPerfil?: string; // Imagen en Base64
}

export const getCurrentUser = (): UserProfile | null => {
  const session = localStorage.getItem("session");
  return session ? JSON.parse(session) : null;
};

export const updateUser = (updatedData: Partial<UserProfile>): UserProfile => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("No hay sesión activa");

  const users: UserProfile[] = JSON.parse(localStorage.getItem("users") || "[]");
  
  // Actualizar en la lista de usuarios
  const updatedUsers = users.map((user) => {
    if (user.documento === currentUser.documento) {
      return { ...user, ...updatedData };
    }
    return user;
  });

  localStorage.setItem("users", JSON.stringify(updatedUsers));

  // Actualizar sesión actual
  const newProfile = { ...currentUser, ...updatedData };
  localStorage.setItem("session", JSON.stringify(newProfile));

  return newProfile;
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
