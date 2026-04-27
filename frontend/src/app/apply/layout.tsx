import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ufl-sys.up.railway.app'),
  title: "UrbanTel Fiber Application Form",
  description: "Apply for high-speed fiber internet with UrbanTel. Fast, reliable, and affordable internet connection for your home or business.",
  keywords: ["fiber internet", "UrbanTel", "internet application", "high-speed internet", "fiber optic"],
  openGraph: {
    title: "UrbanTel Fiber Application Form",
    description: "Apply for high-speed fiber internet with UrbanTel. Fast, reliable, and affordable internet connection.",
    type: "website",
    images: [
      {
        url: "/urbantel.png",
        width: 1200,
        height: 630,
        alt: "UrbanTel Fiber Internet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UrbanTel Fiber Application Form",
    description: "Apply for high-speed fiber internet with UrbanTel. Fast, reliable, and affordable internet connection.",
    images: ["/urbantel.png"],
  },
  icons: {
    icon: [
      { url: '/urbantel.ico' },
    ],
    apple: [
      { url: '/urbantel.png' },
    ],
  },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
