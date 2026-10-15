import { config } from "dotenv";

// Runs before every test file. Loads the committed .env.test so the suite
// never reads your development .env. Variables already present in the
// environment (e.g. set by CI) win over the file.
config({ path: ".env.test" });
