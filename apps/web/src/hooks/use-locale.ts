import { useEffect, useState } from "react";
import i18n, {
	LOCALE_LABELS,
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from "@/i18n";

export interface LocaleOption {
	code: SupportedLanguage;
	nativeLabel: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = SUPPORTED_LANGUAGES.map(
	(code) => ({ code, nativeLabel: LOCALE_LABELS[code] }),
);

function resolveLocale(language: string): SupportedLanguage {
	const exact = SUPPORTED_LANGUAGES.find((code) => code === language);
	if (exact) return exact;

	const base = language.split("-")[0];
	const baseMatch = SUPPORTED_LANGUAGES.find((code) => code === base);
	return baseMatch ?? "en";
}

export function useLocale() {
	const [locale, setLocale] = useState<SupportedLanguage>(() =>
		resolveLocale(i18n.language),
	);

	useEffect(() => {
		const onLanguageChanged = (language: string) => {
			setLocale(resolveLocale(language));
		};

		i18n.on("languageChanged", onLanguageChanged);
		return () => {
			i18n.off("languageChanged", onLanguageChanged);
		};
	}, []);

	function set(next: SupportedLanguage) {
		void i18n.changeLanguage(next);
	}

	return { locale, set, supportedLocales: SUPPORTED_LOCALES };
}
