import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeRoot } from "@/components/ThemeRoot";
import { ThemeToggle } from "@/components/ThemeToggle";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeRoot>
        <ThemeToggle />
      </ThemeRoot>
    </MemoryRouter>,
  );

describe("modo escuro", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("inicia no claro", () => {
    renderAt("/");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("alterna para escuro e guarda a escolha", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Ativar modo escuro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("concreart-theme")).toBe("dark");
  });

  it("login fica sempre claro, mesmo com escuro salvo", () => {
    localStorage.setItem("concreart-theme", "dark");
    renderAt("/login");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
