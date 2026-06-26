"""
Migracion: FEFO + cantidades fraccionadas.
Correr UNA sola vez.
Requiere variable de entorno DATABASE_URL con la cadena de conexión MySQL.
"""
import os
from sqlalchemy import create_engine, text

DB_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DB_URL,
    connect_args={"ssl": {}},
    pool_pre_ping=True,
)


def main():
    print("Conectando a Aiven MySQL...")
    with engine.connect() as conn:
        # 1. Stock_Actual -> DECIMAL
        print("  > Stock_Actual de Insumos -> DECIMAL(10,4)... ", end="", flush=True)
        conn.execute(text(
            "ALTER TABLE Insumos MODIFY COLUMN Stock_Actual DECIMAL(10,4) NOT NULL DEFAULT 0"
        ))
        conn.commit()
        print("OK")

        # 2. Cantidad_Inicial -> DECIMAL
        print("  > Cantidad_Inicial de Lote_Compra -> DECIMAL(10,4)... ", end="", flush=True)
        conn.execute(text(
            "ALTER TABLE Lote_Compra MODIFY COLUMN Cantidad_Inicial DECIMAL(10,4) NOT NULL DEFAULT 0"
        ))
        conn.commit()
        print("OK")

        # 3. Agregar Cantidad_Actual solo si no existe
        print("  > Agregar columna Cantidad_Actual a Lote_Compra... ", end="", flush=True)
        existe = conn.execute(text(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'Lote_Compra' "
            "AND COLUMN_NAME = 'Cantidad_Actual'"
        )).scalar()
        if existe:
            print("ya existe, omitido")
        else:
            conn.execute(text(
                "ALTER TABLE Lote_Compra ADD COLUMN Cantidad_Actual DECIMAL(10,4) NULL"
            ))
            conn.commit()
            print("OK")

        # 4. Inicializar Cantidad_Actual donde sea NULL
        print("  > Inicializar Cantidad_Actual = Cantidad_Inicial en lotes existentes... ", end="", flush=True)
        conn.execute(text(
            "UPDATE Lote_Compra SET Cantidad_Actual = Cantidad_Inicial WHERE Cantidad_Actual IS NULL"
        ))
        conn.commit()
        print("OK")

    print("\nMigracion completada exitosamente.")


if __name__ == "__main__":
    main()
