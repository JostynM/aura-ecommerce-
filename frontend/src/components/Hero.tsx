import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./Hero.css";

type HeroSlide = {
  id: number;
  label: string;
  title: string;
  description: string;
  buttonText: string;
  image: string;
};

const slides: HeroSlide[] = [
  {
    id: 1,
    label: "ESENCIAS DE ORIENTE",
    title: "Intensidad que deja una huella.",
    description:
      "Descubre Khamrah Qahwa, una fragancia cálida, intensa y envolvente con el carácter de la perfumería árabe.",
    buttonText: "Descubrir fragancia",
    image: "/images/hero/khamrah-qahwa.webp",
  },
  {
    id: 2,
    label: "ELEGANCIA ATEMPORAL",
    title: "Una presencia imposible de ignorar.",
    description:
      "Fragancias de diseñador seleccionadas por su personalidad, sofisticación y carácter.",
    buttonText: "Ver diseñador",
    image: "/images/hero/sauvage.webp",
  },
  {
    id: 3,
    label: "CARÁCTER Y SEDUCCIÓN",
    title: "Deja que tu esencia hable por ti.",
    description:
      "Perfumes intensos y memorables creados para acompañar momentos que merecen ser recordados.",
    buttonText: "Explorar perfumes",
    image: "/images/hero/eros.webp",
  },
];

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((current) =>
      current === slides.length - 1 ? 0 : current + 1
    );
  };

  const previousSlide = () => {
    setCurrentSlide((current) =>
      current === 0 ? slides.length - 1 : current - 1
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((current) =>
        current === slides.length - 1 ? 0 : current + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section className="hero">
      <div className="hero-content">

        <div className="hero-text">
          <span className="hero-label">
            {slide.label}
          </span>

          <h1>
            {slide.title}
          </h1>

          <p>
            {slide.description}
          </p>

          <button className="hero-button">
            {slide.buttonText}
            <ArrowRight size={17} strokeWidth={1.5} />
          </button>
        </div>

        <div className="hero-image-container">
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.title}
            className="hero-image"
          />
        </div>

      </div>

      <button
        className="hero-arrow hero-arrow-left"
        onClick={previousSlide}
        aria-label="Perfume anterior"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        className="hero-arrow hero-arrow-right"
        onClick={nextSlide}
        aria-label="Perfume siguiente"
      >
        <ChevronRight size={22} />
      </button>

      <div className="hero-dots">
        {slides.map((item, index) => (
          <button
            key={item.id}
            className={`hero-dot ${
              currentSlide === index ? "hero-dot-active" : ""
            }`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Ir al perfume ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default Hero;