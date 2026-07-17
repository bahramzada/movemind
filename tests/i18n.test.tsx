// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "../src/i18n";

function LanguageProbe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <>
      <p>{t("heroTitle")}</p>
      <span>{locale}</span>
      <button onClick={() => setLocale("az")}>AZ</button>
    </>
  );
}

describe("localization", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("starts in English and persists an Azerbaijani selection", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(screen.getByText("Watch a strategy become visible.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "AZ" }));
    expect(
      screen.getByText("Strategiyanın necə yarandığını izlə."),
    ).toBeTruthy();
    expect(window.localStorage.getItem("movemind-locale")).toBe("az");
    expect(document.documentElement.lang).toBe("az");
  });
});
