import { describe, it, expect } from "vitest";
import { parseRepoUrl } from "@/lib/github/utils";

describe("parseRepoUrl", () => {
  it("parses https urls", () => {
    const p = parseRepoUrl("https://github.com/owner/repo");
    expect(p).toEqual({ owner: "owner", name: "repo" });
  });

  it("parses https urls with .git", () => {
    const p = parseRepoUrl("https://github.com/owner/repo.git");
    expect(p).toEqual({ owner: "owner", name: "repo" });
  });

  it("parses ssh urls", () => {
    const p = parseRepoUrl("git@github.com:owner/repo.git");
    expect(p).toEqual({ owner: "owner", name: "repo" });
  });

  it("returns null for invalid urls", () => {
    expect(parseRepoUrl("")).toBeNull();
    expect(parseRepoUrl("not a url")).toBeNull();
  });
});
