import { EditionMetadata } from "@devographics/types";
import { publicConfig } from "~/config/public";

// i18n contexts common to all surveys and editions
export const getCommonContexts = () => ["common", "surveys", "accounts"];

// i18n contexts specific to an edition
// (note that all editions of the same survey share the same locale context)
export const getEditionContexts = ({
  edition,
}: {
  edition: EditionMetadata;
}) => [edition.survey.id];

export const getLocaleIdFromParams = (params: { lang: string }) => {
  const localeId = filterLang(params.lang);
  if (!localeId) {
    throw new Error(
      `Could not figure out locale from params: ${JSON.stringify(params)}`
    );
  }
  return localeId;
};

/**
 * The "lang" param can be either:
 * - an existing locale (this is guaranteed by the root middleware)
 * - a file path or litterally the param name (due to a bug)
 * This utility returns null if the param is not a valid locale, or the param if it's valid
 */
function filterLang(maybeLocale: string): string | null {
  if (maybeLocale.includes(".")) {
    if (publicConfig.isDev) {
      console.warn(
        `Error: matched a file instead of a lang: ${maybeLocale}. This happens when the file is not found.`
      );
    }
    return null;
  }
  if (maybeLocale === "[lang]" || maybeLocale === "%5Blang%5D") {
    if (publicConfig.isDev) {
      console.warn(
        "Trying to render with param lang literally set to '[lang]'." +
          "This issue has appeared in Next 13.1.0+ (fev 2023)."
      );
    }
    return null;
  }
  return maybeLocale;
}
