export type Locale = "en" | "fr"

export interface AccessGateCopy {
  title: string
  description: string
  label: string
  placeholder: string
  submitLabel: string
  errorText: string
}

export const COPY: Record<Locale, AccessGateCopy> = {
  en: {
    title: "Private preview",
    description: "Enter the access code you were given to continue.",
    label: "Access code",
    placeholder: "",
    submitLabel: "Continue",
    errorText: "That code did not work. Please check it and try again.",
  },
  fr: {
    title: "Aperçu privé",
    description: "Saisissez le code d’accès qui vous a été communiqué pour continuer.",
    label: "Code d’accès",
    placeholder: "",
    submitLabel: "Continuer",
    errorText: "Ce code n’a pas fonctionné. Veuillez le vérifier et réessayer.",
  },
}
