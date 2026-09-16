import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import SignatureDishes from "@/components/home/SignatureDishes";
import About from "@/components/home/About";
import Reservation from "@/components/home/Reservation";
import Contact from "@/components/home/Contact";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SignatureDishes />
        <About />
        <Reservation />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
