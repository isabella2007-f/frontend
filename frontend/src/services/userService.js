// userService.js
const USERS_KEY = "users";

const DEFAULT_USERS = [
  {
    id: 1,
    nombre: "Administrador Tostón",
    correo: "admin@toston.com",
    password: "admin",
    rol: "administrador",
    estado: true,
    fechaCreacion: "2024-01-01"
  },
  {
    id: 2,
    nombre: "Cliente Ejemplo",
    correo: "cliente@toston.com",
    password: "123",
    rol: "cliente",
    estado: true,
    fechaCreacion: "2024-01-02"
  }
];

export const initUsers = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
};

export const getUsers = () => {
  initUsers();
  return JSON.parse(localStorage.getItem(USERS_KEY));
};

export const saveUser = (user) => {
  const users = getUsers();
  if (user.id) {
    // Edit
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ...user } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  } else {
    // Create
    const newUser = {
      ...user,
      id: Date.now(),
      estado: true,
      fechaCreacion: new Date().toISOString().split('T')[0]
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const registerUser = (userData) => {
  const users = getUsers();
  if (users.find(u => u.correo === userData.correo)) {
    throw new Error("El correo ya está registrado");
  }
  
  const newUser = {
    ...userData,
    id: Date.now(),
    rol: "cliente", // Default role for registration
    estado: true,
    fechaCreacion: new Date().toISOString().split('T')[0]
  };
  
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return newUser;
};

export const toggleUserStatus = (id) => {
  const users = getUsers();
  // Prevent deactivating main admin
  if (id === 1) return;
  
  const updatedUsers = users.map(u => u.id === id ? { ...u, estado: !u.estado } : u);
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
};

export const deleteUser = (id) => {
  const users = getUsers();
  // Prevent deleting main admin
  if (id === 1) return;
  
  const filteredUsers = users.filter(u => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
};
