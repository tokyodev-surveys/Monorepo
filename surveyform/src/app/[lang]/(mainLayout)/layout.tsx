import { Metadata } from "next";
import AppLayout from "~/app/[lang]/AppLayout";
import { getCommonContexts, getLocaleIdFromParams } from "~/i18n/config";
import { rscAllLocalesMetadata, rscLocale } from "~/lib/api/rsc-fetchers";

// TODO: not yet compatible with having dynamic pages down the tree
// we may have to call generateStaticParams in each static page instead
// @see https://github.com/vercel/next.js/issues/44712
// export function generateStaticParams() {
//   return locales.map((l) => ({ lang: l }));
// }

export const metadata: Metadata = {
  title: "Devographics Surveys",
  description: "State of JavaScript, CSS, GraphQL and friends",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  // /app/favicon.ico is automatically used as icon
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    lang: string;
  };
}) {
  const contexts = getCommonContexts();
  const localeId = getLocaleIdFromParams(params);
  const locale = await rscLocale({ localeId, contexts });
  const locales = await rscAllLocalesMetadata();
  return (
    <AppLayout
      params={params}
      locales={locales}
      localeId={localeId}
      localeStrings={locale}
    >
      {children}
    </AppLayout>
  );
}
