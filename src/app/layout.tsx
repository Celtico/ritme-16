import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { THEME_KEY } from "@/lib/theme";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RITME-16 — caixa de ritmes",
  description:
    "Seqüenciador de 16 passos amb vuit veus de percussió sintetitzades al navegador.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ddd4c0" },
    { media: "(prefers-color-scheme: dark)", color: "#24231f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ca"
      // l'script de sota escriu data-theme abans que React hidrati; és
      // deliberat, i sense això React avisa d'un atribut que no esperava
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable}`}
    >
      <head>
        {/*
          El tema s'ha de fixar abans del primer pintat: si s'esperés a React,
          es veuria un instant de tema clar abans de passar al fosc. Sense
          tria desada, mana el sistema.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="day"&&t!=="night"){t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"day";}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
