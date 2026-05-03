export const DEPARTAMENTOS_CIUDADES = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Aburrá Sur", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella"],
  "Arauca": ["Arauca", "Arauquita", "Saravena"],
  "Atlántico": ["Barranquilla", "Puerto Colombia", "Soledad", "Malambo"],
  "Bolívar": ["Cartagena", "Turbaco", "Magangué", "Mompós"],
  "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Paipa", "Occidente"],
  "Caldas": ["Manizales", "Villamaría", "Palestina", "La Dorada"],
  "Caquetá": ["Florencia", "Milán", "San Vicente del Caguán"],
  "Cauca": ["Popayán", "Santander de Quilichao", "Corinto", "Puerto Tejada"],
  "Cesar": ["Valledupar", "Bosconia", "Codazzi", "La Paz"],
  "Córdoba": ["Montería", "Tierralta", "Lorica", "Cereté"],
  "Cundinamarca": ["Bogotá", "Soacha", "Zipaquirá", "Facatativá", "Fusagasugá", "Ubaté", "Girardot", "Tena"],
  "Chocó": ["Quibdó", "Istmina", "Río Quito", "Nuquí"],
  "Guaviare": ["San José del Guaviare", "Calamar", "El Retorno"],
  "Guainía": ["Inírida", "Puerto Inírida"],
  "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
  "La Guajira": ["Riohacha", "Maicao", "Uribia", "Fonseca"],
  "Magdalena": ["Santa Marta", "Fundación", "Ciénaga", "Aracataca"],
  "Meta": ["Villavicencio", "Acacías", "Granada", "Restrepo"],
  "Nariño": ["San Juan de Pasto", "Ipiales", "Túquerres", "Puerres"],
  "Norte de Santander": ["Cúcuta", "Los Patios", "Villa del Rosario", "Chinácota"],
  "Putumayo": ["Mocoa", "Sibundoy", "Puerto Asís"],
  "Quindío": ["Armenia", "Calarcá", "Circasia", "Pereira"],
  "Risaralda": ["Pereira", "Dos Quebradas", "Santa Rosa de Cabal", "Cartago"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "San Gil", "Socorro"],
  "Sucre": ["Sincelejo", "Corozal", "San Marcos", "Tolú"],
  "Tolima": ["Ibagué", "Espinal", "Flandes", "Guamo"],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Cartago", "Jamundí", "Yumbo"],
  "Vaupés": ["Mitú", "Caruru"],
  "Vichada": ["Puerto Carreño", "La Primavera"],
};

export const DEPARTAMENTOS = Object.keys(DEPARTAMENTOS_CIUDADES).sort();

export const getCiudades = (departamento) => {
  return DEPARTAMENTOS_CIUDADES[departamento] || [];
};
