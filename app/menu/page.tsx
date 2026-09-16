import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FullMenu from "@/components/menu/FullMenu";

export const metadata: Metadata = {
  title: "Menu | eTandoori",
};

export default function MenuPage() {
  return (
    <>
      <Navbar />
      <main><FullMenu /></main>
      <Footer />
    </>
  );
}
