import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

// ตั้งค่าฟอนต์ Prompt (เอา variable ออก)
const prompt = Prompt({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin", "thai"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://antonettenail.vercel.app";
const title = "Antonette Nail | ร้านทำเล็บ จองคิวออนไลน์";
const description = "Antonette Nail ร้านทำเล็บ ต่อเล็บ เพ้นท์ลาย จองคิวออนไลน์ง่ายๆ เช็คคิวว่างได้ทันที";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | Antonette Nail" },
  applicationName: "Antonette Nail",
  description,
  keywords: ["ร้านทำเล็บ", "ต่อเล็บ", "เพ้นท์เล็บ", "จองคิวทำเล็บ", "Antonette Nail", "nail studio"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: siteUrl,
    siteName: "Antonette Nail",
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Antonette Nail",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* เปลี่ยนมาใช้ prompt.className ตรงนี้ครับ */}
      <body className={`${prompt.className} antialiased`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NailSalon",
              name: "Antonette Nail",
              url: siteUrl,
              image: `${siteUrl}/og-image.png`,
              address: {
                "@type": "PostalAddress",
                streetAddress: "40/67 ซอย 1/5 หมู่บ้านพฤกษา บี รังสิตคลอง3",
                addressLocality: "ตำบลคลองสาม อำเภอคลองหลวง",
                addressRegion: "ปทุมธานี",
                postalCode: "12120",
                addressCountry: "TH",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 14.0419604,
                longitude: 100.6657903,
              },
              hasMap: "https://maps.app.goo.gl/4i5Ga8vDcKhKrSWd8",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
