import { describe, expect, it } from "vitest";
import { nomeArquivoDivulgacao } from "./raster-file";

describe("formatos da foto de divulgação", () => {
  it("gera somente extensões raster PNG e JPG", () => {
    expect(nomeArquivoDivulgacao("Festa da Alice", "png")).toBe("Festa-da-Alice.png");
    expect(nomeArquivoDivulgacao("Festa da Alice.jpeg", "jpg")).toBe("Festa-da-Alice.jpg");
  });
});
