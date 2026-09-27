import {
  ArrowRight,
  Sparkles,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import "./Collections.css";


type Collection = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  link: string;
  className: string;
};


const collections: Collection[] = [
  {
    number: "01",
    eyebrow: "ORIENTE",
    title: "Perfumes Árabes",
    description:
      "Fragancias intensas, cálidas y envolventes con una personalidad imposible de ignorar.",
    link: "/perfumes?tipo=arabe",
    className:
      "collection-arabic",
  },

  {
    number: "02",
    eyebrow: "GRANDES CASAS",
    title: "Diseñador",
    description:
      "Creaciones de casas reconocidas que combinan elegancia, identidad y sofisticación.",
    link: "/perfumes?tipo=diseñador",
    className:
      "collection-designer",
  },

  {
    number: "03",
    eyebrow: "SELECCIÓN",
    title: "Para Él",
    description:
      "Fragancias masculinas con carácter, frescura y presencia para diferentes momentos.",
    link: "/perfumes?genero=hombre",
    className:
      "collection-men",
  },

  {
    number: "04",
    eyebrow: "SELECCIÓN",
    title: "Para Ella",
    description:
      "Composiciones femeninas delicadas, intensas y memorables para expresar cada personalidad.",
    link: "/perfumes?genero=mujer",
    className:
      "collection-women",
  },

  {
    number: "05",
    eyebrow: "SIN LÍMITES",
    title: "Unisex",
    description:
      "Aromas creados para disfrutarse sin etiquetas, elegidos únicamente por lo que te hacen sentir.",
    link: "/perfumes?genero=unisex",
    className:
      "collection-unisex",
  },

  {
    number: "06",
    eyebrow: "AURA",
    title: "Todas las Fragancias",
    description:
      "Explora el catálogo completo y encuentra la fragancia que mejor represente tu esencia.",
    link: "/perfumes",
    className:
      "collection-all",
  },
];


function Collections() {

  return (
    <main className="collections-page">

      {/* ======================================
          HERO
      ====================================== */}

      <section className="collections-hero">

        <div className="collections-hero-inner">

          <span className="collections-eyebrow">
            DESCUBRE AURA
          </span>

          <h1>
            Una fragancia
            <br />
            para cada esencia.
          </h1>

          <p>
            Explora nuestras selecciones
            y encuentra perfumes pensados
            para diferentes estilos,
            personalidades y momentos.
          </p>

        </div>

      </section>


      {/* ======================================
          COLECCIONES
      ====================================== */}

      <section className="collections-grid-section">

        <div className="collections-grid">

          {collections.map(
            (collection) => (

              <Link
                key={collection.number}
                to={collection.link}
                className={
                  `collection-card ${collection.className}`
                }
              >

                <div className="collection-card-top">

                  <span className="collection-number">
                    {collection.number}
                  </span>

                  <Sparkles
                    size={20}
                    strokeWidth={1}
                  />

                </div>


                <div className="collection-card-content">

                  <span className="collection-eyebrow">
                    {collection.eyebrow}
                  </span>

                  <h2>
                    {collection.title}
                  </h2>

                  <p>
                    {collection.description}
                  </p>

                </div>


                <div className="collection-card-footer">

                  <span>
                    Explorar colección
                  </span>

                  <ArrowRight
                    size={17}
                    strokeWidth={1.3}
                  />

                </div>

              </Link>

            ),
          )}

        </div>

      </section>


      {/* ======================================
          BLOQUE EDITORIAL
      ====================================== */}

      <section className="collections-editorial">

        <div className="collections-editorial-logo">
          AURA
        </div>


        <div className="collections-editorial-content">

          <span>
            TU ESENCIA. TU FRAGANCIA.
          </span>

          <h2>
            El perfume correcto
            no solo se lleva.
            Se recuerda.
          </h2>

          <Link
            to="/perfumes"
            className="collections-editorial-link"
          >
            Explorar todos los perfumes

            <ArrowRight
              size={16}
              strokeWidth={1.3}
            />
          </Link>

        </div>

      </section>

    </main>
  );
}


export default Collections;