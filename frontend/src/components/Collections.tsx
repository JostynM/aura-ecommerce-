import CollectionCard from "./CollectionCard";

import "./Collections.css";

const collections = [
  {
    id: 1,
    title: "Árabes",
    subtitle: "Esencias de Oriente",
    image: "/images/collections/arabes.png",
    link: "/perfumes?tipo=arabe",
  },
  {
    id: 2,
    title: "Diseñador",
    subtitle: "Íconos de perfumería",
    image: "/images/collections/diseñador.png",
    link: "/perfumes?tipo=diseñador",
  },
  {
    id: 3,
    title: "Unisex",
    subtitle: "Sin etiquetas",
    image: "/images/collections/unisex.png",
    link: "/perfumes?genero=unisex",
  },
  {
    id: 4,
    title: "Novedades",
    subtitle: "Lo último en AURA",
    image: "/images/collections/novedades.png",
    link: "/perfumes?orden=nuevos",
  },
];

function Collections() {
  return (
    <section className="collections-section">
      <div className="collections-header">
        <span>
          DESCUBRE AURA
        </span>

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
            link={collection.link}
          />
        ))}
      </div>
    </section>
  );
}

export default Collections;