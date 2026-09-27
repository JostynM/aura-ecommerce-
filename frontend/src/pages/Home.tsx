import Hero from "../components/Hero";
import Collections from "../components/Collections";
import BestSellers from "../components/BestSellers";
import AIRecommendation from "../components/AIRecommendation";
import "./Home.css";

function Home() {
  return (
    <main className="home">
      <section className="home__hero">
        <Hero />
      </section>

      <section className="home__section home__section--collections">
        <Collections />
      </section>

      <section className="home__section">
        <BestSellers />
      </section>

      <section className="home__section home__section--ai">
        <AIRecommendation />
      </section>
    </main>
  );
}

export default Home;