import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ufl-sys.up.railway.app'),
  title: "UrbanTel Fiber - Agent Portal",
  description: "View agent information and apply for UrbanTel fiber internet through your trusted agent.",
  keywords: ["fiber internet", "UrbanTel", "internet agent", "high-speed internet"],
  openGraph: {
    title: "UrbanTel Fiber - Agent Portal",
    description: "View agent information and apply for UrbanTel fiber internet through your trusted agent.",
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
    title: "UrbanTel Fiber - Agent Portal",
    description: "View agent information and apply for UrbanTel fiber internet through your trusted agent.",
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

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
