import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AppBackground } from "@/components/layout/AppBackground";

export const metadata: Metadata = {
  title: "Gnostix — AI Document Summarizer",
  description:
    "Upload business documents and get instant AI-powered summaries, key points, and action items.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-full">
        <AppBackground />
        <div className="relative z-10 min-h-full">{children}</div>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#16161f",
              border: "1px solid #1e1e2e",
              color: "#f1f5f9",
            },
          }}
        />
      </body>
    </html>
  );
}
