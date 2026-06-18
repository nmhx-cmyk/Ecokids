export function OrganizationStructuredData() {
  const name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Ecokids";
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo: `${url}/icon-512.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
