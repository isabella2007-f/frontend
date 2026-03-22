import { useState, useEffect } from "react";
import { getUsers, saveUser, toggleUserStatus, deleteUser } from "../../../services/userService";
import { Avatar, Toggle, RolBadge, Field } from "../Usuarios/CrearUsuario";
import { Ic } from "../Usuarios/usuariosIcons";
import { ROL_STYLES } from "../Usuarios/usuariosUtils";
import "../Usuarios/Usuarios.css";

const AccessManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    password: "",
    rol: "cliente"
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const handleToggleStatus = (id) => {
    if (id === 1) return; // Prevent deactivating main admin
    toggleUserStatus(id);
    loadUsers();
  };

  const handleDelete = (id) => {
    if (id === 1) return; // Prevent deleting main admin
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      deleteUser(id);
      loadUsers();
      showToast("Usuario eliminado");
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        correo: user.correo,
        password: user.password,
        rol: user.rol
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: "",
        correo: "",
        password: "",
        rol: "cliente"
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.correo || !formData.password) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }
    saveUser({ ...formData, id: editingUser?.id });
    setShowModal(false);
    loadUsers();
    showToast(editingUser ? "Usuario actualizado" : "Usuario creado");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) || 
    u.correo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="usuarios-page">
      <div className="usuarios-header">
        <h1>Gestión de Acceso</h1>
        <div className="usuarios-header-line" />
      </div>

      <div className="usuarios-card">
        <div className="usuarios-toolbar">
          <div className="usuarios-toolbar-row">
            <div className="usuarios-search-box">
              <span className="search-icon-inner"><Ic.Search /></span>
              <input
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="btn-agregar" onClick={() => handleOpenModal()}>
              Agregar <Ic.Plus />
            </button>
          </div>
        </div>

        <div className="usuarios-table-wrapper">
          <div className="usuarios-table">
            <div className="table-header">
              <div className="table-header-cell">Nombre</div>
              <div className="table-header-cell">Correo</div>
              <div className="table-header-cell center">Rol</div>
              <div className="table-header-cell center">Estado</div>
              <div className="table-header-cell center">Acciones</div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="table-empty">No hay usuarios registrados.</div>
            ) : (
              filteredUsers.map((user, idx) => (
                <div key={user.id} className={`table-row ${idx % 2 === 0 ? "even" : "odd"}`}>
                  <div className="table-cell-name">
                    <Avatar size={32} border={false} />
                    {user.nombre}
                  </div>
                  <div className="table-cell-email">{user.correo}</div>
                  <div className="table-cell-center">
                    <RolBadge rol={user.rol === "administrador" ? "Admin" : "Cliente"} />
                  </div>
                  <div className="table-cell-center">
                    <Toggle 
                      on={user.estado} 
                      onToggle={() => handleToggleStatus(user.id)} 
                      disabled={user.id === 1}
                    />
                  </div>
                  <div className="table-actions">
                    <button 
                      className="action-btn" 
                      style={{ background: "#e3f2fd", color: "#1976d2", borderColor: "#bbdefb" }}
                      title="Editar"
                      onClick={() => handleOpenModal(user)}
                    >
                      <Ic.Edit />
                    </button>
                    {user.id !== 1 && (
                      <button 
                        className="action-btn" 
                        style={{ background: "#ffebee", color: "#c62828", borderColor: "#ffcdd2" }}
                        title="Eliminar"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Ic.Trash />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="table-count">
            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""} encontrado(s)
          </div>
        </div>
      </div>

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? "Editar Acceso" : "Nuevo Acceso"}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><Ic.Close /></button>
            </div>
            <div className="modal-body">
              <Field 
                required 
                label="Nombre Completo" 
                value={formData.nombre} 
                onChange={e => setFormData({...formData, nombre: e.target.value})} 
              />
              <Field 
                required 
                label="Correo Electrónico" 
                value={formData.correo} 
                onChange={e => setFormData({...formData, correo: e.target.value})} 
              />
              <Field 
                required 
                label="Contraseña" 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
              
              <div className="field-wrap">
                <label className="field-label">Rol <span className="required">*</span></label>
                <div className="select-wrap">
                  <select 
                    value={formData.rol} 
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                    className="field-select"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="cliente">Cliente</option>
                  </select>
                  <div className="select-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="modal-btn-row">
                <button className="btn-save" onClick={handleSubmit}>Guardar</button>
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <Ic.Check />
          <span className="toast-msg">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default AccessManagement;