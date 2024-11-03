import { BellaApplication } from "./application.js";

export function main(argv) {
  const application = new BellaApplication();
  return application.runAsync(argv);
}
