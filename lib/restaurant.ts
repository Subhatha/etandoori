// Restaurant details and delivery minimums from menu.pdf.
export const restaurant = {
  phone: "04 50 16 30 56",
  phoneHref: "tel:+33450163056",
  street: "3 Bis Rue des Italiens",
  city: "74200 Thonon-les-Bains",
  address: "3 Bis Rue des Italiens, 74200 Thonon-les-Bains, France",
  website: "https://esushi.fr/",
  lunch: "11:00–14:30",
  dinner: "18:00–22:30",
};

const addressQuery = encodeURIComponent(restaurant.address);
export const restaurantMapUrl = `https://www.google.com/maps?q=${addressQuery}&z=17&output=embed`;
export const restaurantDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`;

export const deliveryZones = [
  { towns: "Thonon", minimum: 20 },
  { towns: "Armoy, Lyaud, Orcier", minimum: 30 },
  { towns: "Allinges, Margencel, Anthy", minimum: 35 },
  { towns: "Sciez, Draillant, Perrigner", minimum: 40 },
  { towns: "Publier, Amphion, Marin", minimum: 45 },
  { towns: "Champagnes, Féternes", minimum: 50 },
  { towns: "Massonay", minimum: 60 },
  { towns: "Évian, Excenevex", minimum: 65 },
];

export const restaurantCopy = {
  fr: {
    title: "Retrouvez-nous à Thonon.", intro: "Sur place, à emporter ou en livraison : contactez-nous pour préparer votre prochaine commande ou votre visite.",
    phone: "Téléphone", call: "Appelez pour commander ou réserver", address: "Notre adresse", directions: "Obtenir l’itinéraire", hours: "Horaires d’ouverture",
    weekdays: "Lundi, mercredi à samedi", tuesday: "Mardi", sunday: "Dimanche", closed: "Fermé", sundayNote: "Fermé le mardi toute la journée et le dimanche midi.",
    map: "Emplacement du restaurant — 3 Bis Rue des Italiens, Thonon-les-Bains", delivery: "Zones de livraison", minimum: "Commande minimum", zone: "Secteur", deliveryNote: "Montant minimum de commande pour la livraison à domicile.",
    services: ["Sur place", "À emporter", "Livraison à domicile"], halal: "Halal", website: "Site indiqué sur notre carte", about: "Une cuisine indienne haute en couleur, où épices, herbes, fruits et légumes se rencontrent. Nous commandons des produits frais chaque jour de la semaine pour vous offrir la meilleure expérience possible.",
  },
  en: {
    title: "Find us in Thonon.", intro: "Dine in, take away or enjoy home delivery. Contact us to arrange your next order or visit.",
    phone: "Telephone", call: "Call to order or reserve", address: "Our address", directions: "Get directions", hours: "Opening hours",
    weekdays: "Monday, Wednesday to Saturday", tuesday: "Tuesday", sunday: "Sunday", closed: "Closed", sundayNote: "Closed all day Tuesday and Sunday lunchtime.",
    map: "Restaurant location — 3 Bis Rue des Italiens, Thonon-les-Bains", delivery: "Delivery areas", minimum: "Minimum order", zone: "Area", deliveryNote: "Minimum order amounts for home delivery.",
    services: ["Dine in", "Takeaway", "Home delivery"], halal: "Halal", website: "Website listed on our menu", about: "Colourful Indian cooking brings together spices, herbs, fruit and vegetables. We order fresh produce every day of the week to offer our guests the best possible experience.",
  },
  de: {
    title: "Besuchen Sie uns in Thonon.", intro: "Bei uns essen, mitnehmen oder nach Hause liefern lassen. Kontaktieren Sie uns für Ihre nächste Bestellung oder Ihren Besuch.",
    phone: "Telefon", call: "Anrufen und bestellen oder reservieren", address: "Unsere Adresse", directions: "Route planen", hours: "Öffnungszeiten",
    weekdays: "Montag, Mittwoch bis Samstag", tuesday: "Dienstag", sunday: "Sonntag", closed: "Geschlossen", sundayNote: "Dienstags ganztägig und sonntags mittags geschlossen.",
    map: "Restaurantstandort — 3 Bis Rue des Italiens, Thonon-les-Bains", delivery: "Liefergebiete", minimum: "Mindestbestellwert", zone: "Gebiet", deliveryNote: "Mindestbestellwerte für die Lieferung nach Hause.",
    services: ["Vor Ort", "Zum Mitnehmen", "Lieferung nach Hause"], halal: "Halal", website: "Website auf unserer Speisekarte", about: "Unsere farbenfrohe indische Küche vereint Gewürze, Kräuter, Obst und Gemüse. Wir bestellen an jedem Tag der Woche frische Produkte, um unseren Gästen das bestmögliche Erlebnis zu bieten.",
  },
};
