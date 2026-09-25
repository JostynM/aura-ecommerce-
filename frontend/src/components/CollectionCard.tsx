import { ArrowRight } from "lucide-react";
import "./CollectionCard.css";

type CollectionCardProps = {
  title: string;
  subtitle: string;
  image: string;
};

function CollectionCard({
  title,
  subtitle,
  image,
}: CollectionCardProps) {
  return (
    <article
      className="collection-card"
      style={{
        backgroundImage: `url(${image})`,
      }}
    >
      <div className="collection-overlay" />

      <div className="collection-card-content">
        <span>{subtitle}</span>

        <h3>{title}</h3>

        <button>
          Explorar
          <ArrowRight size={15} strokeWidth={1.5} />
        </button>
      </div>
    </article>
  );
}

export default CollectionCard;