import { ArrowRight, Sparkles } from "lucide-react";
import "./AIRecommendation.css";

function AIRecommendation() {
  return (
    <section className="ai-section">

      <div className="ai-content">

        <div className="ai-text">
          <span className="ai-label">
            PERFUME AI
          </span>

          <h2>
            Encuentra una fragancia
            hecha para ti.
          </h2>

          <p>
            Cuéntanos qué aromas prefieres, en qué ocasiones
            usarás tu perfume y cuál es tu presupuesto.
            AURA analizará nuestras fragancias y te recomendará
            las mejores opciones.
          </p>

          <button className="ai-button">
            Encontrar mi perfume
            <ArrowRight size={17} strokeWidth={1.5} />
          </button>
        </div>

        <div className="ai-visual">

          <div className="ai-orb">
            <Sparkles size={34} strokeWidth={1.3} />
          </div>

          <span>
            Recomendación personalizada
          </span>

        </div>

      </div>

    </section>
  );
}

export default AIRecommendation;