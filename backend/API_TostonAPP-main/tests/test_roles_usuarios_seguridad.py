"""Blindaje de Roles y Usuarios, recorrido por HTTP contra la API real.

Cubre lo que introdujo prompts/prompt-roles.md:
- rol Cliente estático y sin permisos (editar/eliminar bloqueados, estado no)
- super admin (usuario ID 1) intocable
- admin normal no gestiona a otro admin normal; el super admin sí
- nadie se cambia el rol a sí mismo; solo el super admin asigna el rol Admin
- crear usuario sin permiso de rol -> nace Cliente
- editar usuario ignora ID_Rol en el payload

Corre sin credenciales:
    python -m unittest tests.test_roles_usuarios_seguridad
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import (  # noqa: E402
    API, PanelBase, Rol, Usuario, RolXPermiso, Permiso,
    ROL_ADMIN, ROL_CLIENTE, ROL_EMPLEADO, ID_ADMIN, _token,
)

ROL_GESTOR    = 6   # ver/crear/editar/eliminar usuarios + cambiar_rol_usuarios
ROL_RECEPCION = 7   # ver/crear usuarios (SIN cambiar_rol_usuarios)

ID_ADMIN_NORMAL   = 50
ID_ADMIN_NORMAL_2 = 51
ID_GESTOR         = 52
ID_RECEPCION      = 53
ID_OBJETIVO       = 54   # empleado corriente al que se le cambian cosas


def _grant(db, id_rol, *nombres):
    for nombre in nombres:
        p = db.query(Permiso).filter(Permiso.Permiso == nombre).first()
        if p is None:
            p = Permiso(Permiso=nombre, Descripcion=nombre)
            db.add(p)
            db.flush()
        db.add(RolXPermiso(ID_Rol=id_rol, ID_Permiso=p.ID_Permiso))


class RolesUsuariosSeguridad(PanelBase):
    def setUp(self):
        super().setUp()
        self.db.add(Rol(ID_Rol=ROL_GESTOR,    Rol="Gestor",    Estado=1))
        self.db.add(Rol(ID_Rol=ROL_RECEPCION, Rol="Recepcion", Estado=1))
        self.db.flush()

        _grant(self.db, ROL_GESTOR, "ver_usuarios", "crear_usuarios",
               "editar_usuarios", "eliminar_usuarios", "cambiar_rol_usuarios")
        _grant(self.db, ROL_RECEPCION, "ver_usuarios", "crear_usuarios", "editar_usuarios")

        for uid, correo, rol in (
            (ID_ADMIN_NORMAL,   "an1@t.test", ROL_ADMIN),
            (ID_ADMIN_NORMAL_2, "an2@t.test", ROL_ADMIN),
            (ID_GESTOR,         "gestor@t.test", ROL_GESTOR),
            (ID_RECEPCION,      "recep@t.test", ROL_RECEPCION),
            (ID_OBJETIVO,       "obj@t.test", ROL_EMPLEADO),
        ):
            self.db.add(Usuario(ID_Usuario=uid, Nombre="N", Apellidos="A",
                                Correo=correo, ID_Rol=rol, Estado=1))
        self.db.commit()

        self.super_admin  = self.admin  # ID_ADMIN == 1 en panel.py
        self.admin_normal = {"Authorization": "Bearer " + _token(ID_ADMIN_NORMAL, "empleado", "Administrador")}
        self.gestor       = {"Authorization": "Bearer " + _token(ID_GESTOR, "empleado", "Gestor")}
        self.recepcion    = {"Authorization": "Bearer " + _token(ID_RECEPCION, "empleado", "Recepcion")}

    # ── Rol Cliente estático ───────────────────────────────────────────────
    def test_cliente_sin_permisos_tras_seed(self):
        self.assertEqual(
            self.db.query(RolXPermiso).filter(RolXPermiso.ID_Rol == ROL_CLIENTE).count(), 0
        )

    def test_rol_cliente_no_se_edita_ni_elimina_pero_si_cambia_estado(self):
        self.assertEqual(self.client.put(f"{API}/roles/{ROL_CLIENTE}", json={"Rol": "Otro"}, headers=self.super_admin).status_code, 403)
        self.assertEqual(self.client.delete(f"{API}/roles/{ROL_CLIENTE}", headers=self.super_admin).status_code, 403)
        self.assertEqual(self.client.put(f"{API}/roles/{ROL_CLIENTE}/permisos", json={"permisos": ["ver_pedidos"]}, headers=self.super_admin).status_code, 403)
        self.assertEqual(self.client.patch(f"{API}/roles/{ROL_CLIENTE}/estado", json={"Estado": 2}, headers=self.super_admin).status_code, 200)

    # ── Super admin intocable ─────────────────────────────────────────────
    def test_nadie_toca_al_super_admin(self):
        self.assertEqual(self.client.put(f"{API}/usuarios/{ID_ADMIN}", json={"Nombre": "Hack"}, headers=self.admin_normal).status_code, 403)
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_ADMIN}/estado", json={"Estado": 2}, headers=self.admin_normal).status_code, 400)
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_ADMIN}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.admin_normal).status_code, 403)
        self.assertEqual(self.client.delete(f"{API}/usuarios/{ID_ADMIN}", headers=self.admin_normal).status_code, 400)

    def test_super_admin_no_se_cambia_su_propio_rol(self):
        self.assertEqual(
            self.client.patch(f"{API}/usuarios/{ID_ADMIN}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.super_admin).status_code,
            403,
        )

    # ── Admin normal ─────────────────────────────────────────────────────
    def test_admin_normal_no_gestiona_a_otro_admin_normal(self):
        self.assertEqual(self.client.put(f"{API}/usuarios/{ID_ADMIN_NORMAL_2}", json={"Nombre": "X"}, headers=self.admin_normal).status_code, 403)
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_ADMIN_NORMAL_2}/estado", json={"Estado": 2}, headers=self.admin_normal).status_code, 403)
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_ADMIN_NORMAL_2}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.admin_normal).status_code, 403)

    def test_super_admin_si_gestiona_a_los_admin_normales(self):
        r = self.client.patch(f"{API}/usuarios/{ID_ADMIN_NORMAL}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.super_admin)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.db.get(Usuario, ID_ADMIN_NORMAL).ID_Rol, ROL_CLIENTE)

    # ── Cambiar rol ─────────────────────────────────────────────────────
    def test_nadie_se_cambia_su_propio_rol(self):
        self.assertEqual(
            self.client.patch(f"{API}/usuarios/{ID_GESTOR}/rol", json={"ID_Rol": ROL_ADMIN}, headers=self.gestor).status_code,
            403,
        )

    def test_solo_super_admin_asigna_rol_admin(self):
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_OBJETIVO}/rol", json={"ID_Rol": ROL_ADMIN}, headers=self.gestor).status_code, 403)
        self.assertEqual(self.client.patch(f"{API}/usuarios/{ID_OBJETIVO}/rol", json={"ID_Rol": ROL_ADMIN}, headers=self.super_admin).status_code, 200)

    def test_gestor_degrada_a_cliente(self):
        r = self.client.patch(f"{API}/usuarios/{ID_OBJETIVO}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.gestor)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.db.get(Usuario, ID_OBJETIVO).ID_Rol, ROL_CLIENTE)

    def test_recepcion_sin_permiso_no_cambia_roles(self):
        self.assertEqual(
            self.client.patch(f"{API}/usuarios/{ID_OBJETIVO}/rol", json={"ID_Rol": ROL_CLIENTE}, headers=self.recepcion).status_code,
            403,
        )

    # ── Crear usuario ──────────────────────────────────────────────────
    def test_crear_cliente_sin_permiso_de_rol_nace_cliente(self):
        payload = {
            "Cedula": "12345678", "Tipo_Documento": "CC", "Nombre": "Nuevo",
            "Apellidos": "Cliente", "Correo": "nuevo@correo.com", "Contrasena": "Toston@2024",
            "Telefono": "3001234567", "ID_Rol": ROL_ADMIN,   # intento de escalar
        }
        r = self.client.post(f"{API}/usuarios/cliente", json=payload, headers=self.recepcion)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(r.json()["ID_Rol"], ROL_CLIENTE)

    def test_recepcion_no_crea_empleado(self):
        payload = {
            "Cedula": "87654321", "Tipo_Documento": "CC", "Nombre": "N", "Apellidos": "A",
            "Correo": "wannabe@correo.com", "Contrasena": "Toston@2024",
            "Telefono": "3001234567", "ID_Rol": ROL_EMPLEADO,
        }
        self.assertEqual(
            self.client.post(f"{API}/usuarios/empleado", json=payload, headers=self.recepcion).status_code, 403
        )

    def test_gestor_no_crea_admin(self):
        payload = {
            "Cedula": "11223344", "Tipo_Documento": "CC", "Nombre": "N", "Apellidos": "A",
            "Correo": "adminwannabe@correo.com", "Contrasena": "Toston@2024",
            "Telefono": "3001234567", "ID_Rol": ROL_ADMIN,
        }
        self.assertEqual(
            self.client.post(f"{API}/usuarios/empleado", json=payload, headers=self.gestor).status_code, 403
        )

    # ── Hallazgos Fase 3 ─────────────────────────────────────────────
    def test_password_debil_rechazada_al_crear(self):
        payload = {
            "Cedula": "99887766", "Tipo_Documento": "CC", "Nombre": "N", "Apellidos": "A",
            "Correo": "debil@correo.com", "Contrasena": "1234",
            "Telefono": "3001234567",
        }
        r = self.client.post(f"{API}/usuarios/cliente", json=payload, headers=self.gestor)
        self.assertEqual(r.status_code, 400)
        self.assertIn("contraseña", r.text.lower())

    def test_un_par_no_gestiona_a_otro_gestor_de_usuarios(self):
        # gestor (no admin) intenta editar a recepción (también gestiona usuarios)
        r = self.client.put(f"{API}/usuarios/{ID_RECEPCION}", json={"Nombre": "X"}, headers=self.gestor)
        self.assertEqual(r.status_code, 403)
        r = self.client.patch(f"{API}/usuarios/{ID_RECEPCION}/estado", json={"Estado": 2}, headers=self.gestor)
        self.assertEqual(r.status_code, 403)
        # el super admin sí puede
        r = self.client.put(f"{API}/usuarios/{ID_RECEPCION}", json={"Nombre": "OK"}, headers=self.super_admin)
        self.assertEqual(r.status_code, 200, r.text)

    def test_reactivar_rol_no_reactiva_usuarios_desactivados_a_mano(self):
        from panel import Rol as _R  # noqa
        # Un empleado activo del rol Recepcion, y otro desactivado a mano.
        self.db.add(Usuario(ID_Usuario=70, Nombre="Act", Apellidos="A", Correo="act@x.test", ID_Rol=ROL_RECEPCION, Estado=1))
        self.db.add(Usuario(ID_Usuario=71, Nombre="Man", Apellidos="A", Correo="man@x.test", ID_Rol=ROL_RECEPCION, Estado=2))
        self.db.commit()
        self.assertEqual(self.client.patch(f"{API}/roles/{ROL_RECEPCION}/estado", json={"Estado": 2}, headers=self.super_admin).status_code, 200)
        self.assertEqual(self.db.get(Usuario, 70).Estado, 2)
        self.assertEqual(self.client.patch(f"{API}/roles/{ROL_RECEPCION}/estado", json={"Estado": 1}, headers=self.super_admin).status_code, 200)
        # Reactivar el rol NO reactiva a los usuarios.
        self.assertEqual(self.db.get(Usuario, 70).Estado, 2)
        self.assertEqual(self.db.get(Usuario, 71).Estado, 2)

    # ── Editar ignora ID_Rol ──────────────────────────────────────────
    def test_editar_usuario_ignora_id_rol_en_el_payload(self):
        r = self.client.put(
            f"{API}/usuarios/{ID_OBJETIVO}",
            json={"Nombre": "Renombrado", "ID_Rol": ROL_ADMIN},
            headers=self.super_admin,
        )
        self.assertEqual(r.status_code, 200, r.text)
        u = self.db.get(Usuario, ID_OBJETIVO)
        self.assertEqual(u.Nombre, "Renombrado")
        self.assertEqual(u.ID_Rol, ROL_EMPLEADO)


if __name__ == "__main__":
    unittest.main()
