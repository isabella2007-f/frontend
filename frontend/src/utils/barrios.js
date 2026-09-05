/**
 * Los barrios de cada municipio donde se entrega.
 *
 * Espeja `lib/config/barrios_config.dart` de la app. El costo del domicilio
 * va a depender del barrio, así que el barrio tiene que ser una opción de una
 * lista y no un renglón escrito a mano: "Manrique", "manrique" y "Barrio
 * Manrique" son tres barrios distintos para cualquier tabla de tarifas, y la
 * web y la app tienen que ofrecer exactamente los mismos.
 *
 * La lista no es un censo. Para el barrio que falte está BARRIO_OTRO, que abre
 * un campo de texto: sin esa salida, quien viva en uno que no esté no puede
 * pedir, y eso es peor que una lista incompleta.
 */

/** La opción para el barrio que no está en la lista. */
export const BARRIO_OTRO = 'Otro (escribirlo)';

export const BARRIOS_POR_MUNICIPIO = {
  'Medellín': [
    'Santo Domingo Savio', 'Popular', 'Granizal', 'Moscú', 'Villa Guadalupe',
    'San Pablo', 'Aldea Pablo VI', 'Santa Cruz', 'La Isla', 'La Frontera',
    'Playón de los Comuneros', 'Andalucía', 'Villa del Socorro', 'Villa Niza',
    'Moravia', 'Manrique Central', 'Manrique Oriental', 'Campo Valdés',
    'Las Granjas', 'San José La Cima', 'La Salle', 'Versalles', 'Santa Inés',
    'El Raizal', 'Aranjuez', 'Berlín', 'San Isidro', 'Palermo', 'Bermejal',
    'Moravia Centro', 'Brasilia', 'Miranda', 'Sevilla', 'Campo Valdés No. 1',
    'Castilla', 'Toscana', 'Florencia', 'Tejelo', 'Boyacá', 'Héctor Abad',
    'Belalcázar', 'Girardot', 'Tricentenario', 'Alfonso López', 'Caribe',
    'Doce de Octubre', 'Santander', 'Pedregal', 'La Esperanza', 'Kennedy',
    'Picacho', 'Progreso', 'Mirador del Doce', 'Robledo', 'Villa Flora',
    'Córdoba', 'López de Mesa', 'Aures', 'Bello Horizonte', 'Cucaracho',
    'Pajarito', 'San Germán', 'Altamira', 'Villa Hermosa', 'La Ladera',
    'Enciso', 'Sucre', 'Los Mangos', 'Villatina', 'San Antonio', 'Llanaditas',
    'La Sierra', 'Buenos Aires', 'Miraflores', 'Loreto', 'Cataluña',
    'Alejandro Echavarría', 'Barrio Caicedo', 'Gerona', 'Bomboná',
    'La Milagrosa', 'La Candelaria', 'Prado Centro', 'Villa Nueva', 'Boston',
    'Los Ángeles', 'San Benito', 'Guayaquil', 'Corazón de Jesús',
    'Perpetuo Socorro', 'San Diego', 'Colón', 'Estación Villa', 'Laureles',
    'Estadio', 'Conquistadores', 'Bolivariana', 'Suramericana', 'Los Colores',
    'Carlos E. Restrepo', 'Naranjal', 'Florida Nueva', 'San Joaquín',
    'Lorena', 'Cuarta Brigada', 'La América', 'Santa Lucía',
    'Barrio Cristóbal', 'Simón Bolívar', 'Calasanz', 'Los Pinos',
    'La Floresta', 'Ferrini', 'Santa Mónica', 'San Javier', 'El Salado',
    'Veinte de Julio', 'Belencito', 'Betania', 'Juan XXIII', 'Antonio Nariño',
    'Nuevos Conquistadores', 'Metropolitano', 'El Poblado', 'Provenza',
    'Manila', 'Astorga', 'Patio Bonito', 'Castropol', 'Lalinde',
    'Villa Carlota', 'El Tesoro', 'Los Balsos', 'Las Lomas',
    'Santa María de los Ángeles', 'La Aguacatala', 'Alejandría', 'Guayabal',
    'Cristo Rey', 'Campo Amor', 'Santa Fe', 'Tenche', 'La Colina', 'Trinidad',
    'Belén', 'Belén Rosales', 'La Mota', 'La Palma', 'Los Alpes', 'Fátima',
    'Granada', 'San Bernardo', 'Las Playas', 'Loma de los Bernal',
    'Altavista', 'Nueva Villa de Aburrá', 'El Rincón', 'La Hondonada',
    'Otro (escribirlo)',
  ],
  'Bello': [
    'Niquía', 'París', 'Cabañas', 'La Cumbre', 'Zamora', 'Santa Ana',
    'Playa Rica', 'Rosalpi', 'Bellavista', 'La Madera', 'Prado', 'Suárez',
    'Pérez', 'Fontidueño', 'El Trébol', 'Acevedo', 'Machado', 'Mirador',
    'Las Vegas', 'Los Alpes', 'Manchester', 'San Martín', 'Salento',
    'Congolo', 'La Milagrosa', 'Amazonía', 'Central', 'Otro (escribirlo)',
  ],
  'Itagüí': [
    'Santa María', 'San Pío X', 'La Independencia', 'Simón Bolívar',
    'San Francisco', 'El Rosario', 'Playa Rica', 'Las Acacias', 'Villa Paula',
    'Calatrava', 'San Gabriel', 'Ditaires', 'Asturias', 'Yarumito',
    'Balcones de Sevilla', 'La Gloria', 'Samaria', 'Los Naranjos', 'Fátima',
    'Centro', 'Santa Ana', 'El Palmar', 'Otro (escribirlo)',
  ],
  'Envigado': [
    'El Dorado', 'La Magnolia', 'Las Vegas', 'Zúñiga', 'Jardines', 'La Paz',
    'El Salado', 'Alcalá', 'San Marcos', 'Bosques de Zúñiga', 'Otraparte',
    'Uribe Ángel', 'Milán Vallejuelos', 'El Chinguí', 'Mesa', 'Las Antillas',
    'Loma del Barro', 'Primavera', 'Centro', 'La Inmaculada', 'Pontevedra',
    'San Rafael', 'Otro (escribirlo)',
  ],
  'Sabaneta': [
    'Aves María', 'Betania', 'Calle del Banco', 'Restrepo Naranjo',
    'San Joaquín', 'Playas de María', 'Holanda', 'Prados de Sabaneta',
    'Villas del Carmen', 'La Doctora', 'Las Casitas', 'María Auxiliadora',
    'Paso Ancho', 'Vegas de San José', 'Centro', 'San Rafael',
    'Otro (escribirlo)',
  ],
  'La Estrella': [
    'Ancón', 'Bellavista', 'Camilo Torres', 'Chile', 'El Dorado', 'Escobar',
    'La Chinca', 'La Inmaculada', 'La Tablaza', 'Monterrey', 'Primavera',
    'San Agustín', 'San Andrés', 'San Isidro', 'Centro', 'Sagrada Familia',
    'Tablacita', 'Otro (escribirlo)',
  ],
  'Caldas': [
    'Centro', 'La Docena', 'Andalucía', 'Bellavista', 'El Cano',
    'Felipe Echavarría', 'La Chuscala', 'La Corrala', 'La Inmaculada',
    'La Planta', 'Mandalay', 'Olivares', 'Primavera', 'Río Medellín',
    'Cristo Rey', 'Fundadores', 'Los Cerezos', 'Otro (escribirlo)',
  ],
  'Copacabana': [
    'Centro', 'El Recreo', 'Fátima', 'La Azulita', 'La Misericordia',
    'Las Vegas', 'Machado', 'María', 'Pedregal', 'San Juan', 'Villanueva',
    'Zarzal', 'El Pedregal', 'Tobón Quintero', 'Ancón', 'Otro (escribirlo)',
  ],
  'Girardota': [
    'Centro', 'El Barro', 'El Palmar', 'Juan Cooca', 'La Estrella',
    'La Meseta', 'Llano de Ovejas', 'Manga', 'Mercedes Ábrego',
    'Nuestra Señora del Rosario', 'Portachuelo', 'San Andrés', 'San Diego',
    'Loma de los Ochoa', 'Otro (escribirlo)',
  ],
  'Barbosa': [
    'Centro', 'El Carmen', 'El Hatillo', 'Buga', 'La Ceiba', 'La Playita',
    'Popayán', 'San Antonio', 'Santa Gertrudis', 'Vertical', 'Yarumito',
    'Platanito', 'Isaza', 'Otro (escribirlo)',
  ],
};

/** Los barrios de `municipio`, o solo la salida "otro" si no se conoce. */
export const barriosDe = (municipio) =>
  BARRIOS_POR_MUNICIPIO[municipio] || [BARRIO_OTRO];
