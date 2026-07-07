import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="h-full scroll-smooth">
      <Head>
        <meta name="description" content="A dynamic and premium Notice Board with full CRUD features" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="h-full antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
