import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import "./CollectionCard.css";

type CollectionCardProps = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

function CollectionCard({
  title,
  subtitle,
  image,
  link,
}: CollectionCardProps) {
  return (
    <Link
      to={link}
      className="collection-card"
      style={{
        backgroundImage: `url(${image})`,
      }}
    >
      <div className="collection-overlay" />

      <div className="collection-card-content">
        <span>{subtitle}</span>

        <h3>{title}</h3>

        <div className="collection-card-action">
          Explorar

          <ArrowRight
            size={15}
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Link>
  );
}

export default CollectionCard;