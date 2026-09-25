import { FaInstagram } from "react-icons/fa";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-content">

        <div className="footer-brand">
          <h2>AURA</h2>

          <p>
            Fragancias seleccionadas para acompañar
            cada momento y expresar tu esencia.
          </p>
        </div>

        <div className="footer-column">
          <h3>Comprar</h3>

          <a href="#">Perfumes</a>
          <a href="#">Árabes</a>
          <a href="#">Diseñador</a>
          <a href="#">Novedades</a>
        </div>

        <div className="footer-column">
          <h3>Ayuda</h3>

          <a href="#">Contacto</a>
          <a href="#">Envíos</a>
          <a href="#">Cambios y devoluciones</a>
          <a href="#">Preguntas frecuentes</a>
        </div>

        <div className="footer-column">
          <h3>Mi cuenta</h3>

          <a href="#">Mi perfil</a>
          <a href="#">Mis pedidos</a>
          <a href="#">Favoritos</a>
          <a href="#">Direcciones</a>
        </div>

        <div className="footer-column">
          <h3>Legal</h3>

          <a href="#">Términos y condiciones</a>
          <a href="#">Política de privacidad</a>
          <a href="#">Política de cookies</a>
        </div>

      </div>

      <div className="footer-bottom">

        <span>
          © 2026 AURA. Todos los derechos reservados.
        </span>

        <div className="footer-social">
          <a href="#" aria-label="Instagram">
            <FaInstagram size={18} />
          </a>
        </div>

      </div>

    </footer>
  );
}

export default Footer;