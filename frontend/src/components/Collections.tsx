import CollectionCard from "./CollectionCard";
import "./Collections.css";

const collections = [
  {
    id: 1,
    title: "Árabes",
    subtitle: "Esencias de Oriente",
    image: "/images/collections/arabes.webp",
  },
  {
    id: 2,
    title: "Diseñador",
    subtitle: "Íconos de perfumería",
    image: "/images/collections/diseñador.webp",
  },
  {
    id: 3,
    title: "Unisex",
    subtitle: "Sin etiquetas",
    image: "/images/collections/unisex.webp",
  },
  {
    id: 4,
    title: "Novedades",
    subtitle: "Lo último en AURA",
    image: "/images/collections/novedades.jpeg",
  },
];

function Collections() {
  return (
    <section className="collections-section">

      <div className="collections-header">
        <span>DESCUBRE AURA</span>

        <h2>
          Encuentra una fragancia
          para cada versión de ti.
        </h2>
      </div>

      <div className="collections-grid">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            title={collection.title}
            subtitle={collection.subtitle}
            image={collection.image}
          />
        ))}
      </div>

    </section>
  );
}

export default Collections;