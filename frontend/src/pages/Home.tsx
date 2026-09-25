import Hero from "../components/Hero";
import Collections from "../components/Collections";
import BestSellers from "../components/BestSellers";
import AIRecommendation from "../components/AIRecommendation";

function Home() {
  return (
    <>
      <Hero />
      <Collections />
      <BestSellers />
      <AIRecommendation />
    </>
  );
}

export default Home;