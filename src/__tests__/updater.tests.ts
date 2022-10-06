// import { isNewVersionNuber } from "../helpers/updater";
import { describe, expect, it } from "@jest/globals";

const isNewVersionNuber = (actual: string, incoming: string) => {
  for (let i = 0; i < 3; i++) {
    const act = parseInt(actual.split(".")[i]);
    const inc = parseInt(incoming.split(".")[i]);

    if (inc > act) return true;
    if (act > inc) return false;
  }
  return false;
};

describe("UPDATER version checker", () => {
  it("From ver 5.0.4, ver 5.0.4 should not be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "5.0.4")).toBeFalsy();
  });
  it("Fromver 5.9.4, ver 5.11.5 should be considered new version ", () => {
    expect(isNewVersionNuber("5.9.4", "5.11.5")).toBeTruthy();
  });
  it("From ver 5.0.4, ver 5.1.0 should be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "5.1.0")).toBeTruthy();
  });
  it("From ver 5.0.4, ver 6.0.0 should be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "6.0.0")).toBeTruthy();
  });
  it("From ver 5.0.4, ver 5.0.3 should not be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "5.0.3")).toBeFalsy();
  });
  it("From ver 5.0.4, ver 4.0.4 should not be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "4.0.4")).toBeFalsy();
  });
  it("From ver 5.0.4, ver 4.1.0 should not be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "4.1.0")).toBeFalsy();
  });

  it("From ver 5.0.4, ver 4.0.0 should not be considered new version ", () => {
    expect(isNewVersionNuber("5.0.4", "4.0.0")).toBeFalsy();
  });
  it("From ver 4.1.4, ver 5.0.4 should be considered new version ", () => {
    expect(isNewVersionNuber("4.0.4", "5.0.4")).toBeTruthy();
  });
  it("From ver 4.1.4, ver 5.0.5 should be considered new version ", () => {
    expect(isNewVersionNuber("4.0.4", "5.0.5")).toBeTruthy();
  });
  it("From ver 4.1.4, ver 5.1.0 should be considered new version ", () => {
    expect(isNewVersionNuber("4.0.4", "5.1.0")).toBeTruthy();
  });
  it("From ver 4.1.4, ver 6.0.0 should be considered new version ", () => {
    expect(isNewVersionNuber("4.25.4", "6.0.0")).toBeTruthy();
  });
  it("From ver 4.1.4, ver 5.0.3 should be considered new version ", () => {
    expect(isNewVersionNuber("4.1.4", "5.0.3")).toBeTruthy();
  });
  it("From ver 4.22.0, ver 4.0.222 should not be considered new version ", () => {
    expect(isNewVersionNuber("4.22.0", "4.0.222")).toBeFalsy();
  });
  it("From ver 4.22.0, ver 4.0.0 should not be considered new version ", () => {
    expect(isNewVersionNuber("4.22.0", "4.0.0")).toBeFalsy();
  });
  it("From ver 4.22.0, ver 4.0.1 should not be considered new version ", () => {
    expect(isNewVersionNuber("4.22.0", "4.0.1")).toBeFalsy();
  });
  it("From ver 4.22.0, ver 4.0.2 should not be considered new version ", () => {
    expect(isNewVersionNuber("4.22.0", "4.0.2")).toBeFalsy();
  });
  it("From ver 4.22.0, ver 4.0.3 should not be considered new version ", () => {
    expect(isNewVersionNuber("4.22.0", "4.0.3")).toBeFalsy();
  });
  it("From ver 0.0.0, ver 0.0.0 should not be considered new version ", () => {
    expect(isNewVersionNuber("0.0.0", "0.0.0")).toBeFalsy();
  });
  it("From ver 0.0.0, ver 0.0.1 should be considered new version ", () => {
    expect(isNewVersionNuber("0.0.0", "0.0.1")).toBeTruthy();
  });
  it("From ver 0.0.0, ver 0.1.0 should be considered new version ", () => {
    expect(isNewVersionNuber("0.0.0", "0.1.0")).toBeTruthy();
  });
});
