const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");

const EXPECTED_DEMO_USER =
  "887afb6f-6e03-47e3-9ce0-6a54fdab4dd0";

// Read .env without printing secrets.
function loadEnv(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Environment file not found: ${file}`);
  }

  const contents = fs.readFileSync(file, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/
    );

    if (!match || process.env[match[1]] !== undefined) {
      continue;
    }

    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[match[1]] = value;
  }
}

function report(name, status, detail = "") {
  const icon =
    status === "PASS" ? "PASS" :
    status === "WARN" ? "WARN" : "FAIL";

  console.log(`[${icon}] ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  console.log("\n==================================");
  console.log("       SNAPIT HEALTH CHECK");
  console.log("==================================\n");

  try {
    loadEnv(ENV_FILE);
  } catch (error) {
    report("Environment", "FAIL", error.message);
    process.exitCode = 1;
    return;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    report(
      "Environment variables",
      "FAIL",
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
    );
    process.exitCode = 1;
    return;
  }

  let projectHost;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      report("Project URL", "WARN", "URL is not HTTPS");
    }

    projectHost = parsed.hostname;
    report("Project URL", "PASS", projectHost);
  } catch {
    report("Project URL", "FAIL", "Invalid Supabase URL");
    process.exitCode = 1;
    return;
  }

  if (projectHost !== "cyiuwwzfwwvivgxbaxaz.supabase.co") {
    report(
      "Project identity",
      "WARN",
      "URL differs from the expected Snapit project"
    );
  } else {
    report("Project identity", "PASS", "Expected Snapit project");
  }

  if (key.startsWith("sb_secret_") || key.startsWith("service_role")) {
    report(
      "API key safety",
      "FAIL",
      "A privileged key must not be used in client configuration"
    );
    process.exitCode = 1;
    return;
  }

  report("API key configuration", "PASS", "Key present; value hidden");

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let failures = 0;
  let warnings = 0;

  console.log("\n--- Authentication ---");
  const smokeEmail = process.env.SMOKE_TEST_EMAIL;
  const smokePassword = process.env.SMOKE_TEST_PASSWORD;

  if (smokeEmail && smokePassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: smokeEmail,
      password: smokePassword,
    });
    if (signInError) {
      report("Sign in", "FAIL", signInError.message);
      failures++;
    } else {
      report("Sign in", "PASS", `Signed in as ${smokeEmail}`);
    }
  } else {
    report(
      "Sign in",
      "WARN",
      "Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD to test owner-only RLS"
    );
    warnings++;
  }

  async function checkTable(table) {
    try {
      const { error } = await supabase
        .from(table)
        .select("*")
        .limit(1);

      if (!error) {
        report(`Table: ${table}`, "PASS", "Query succeeded");
        return;
      }

      const message = error.message || "Unknown database error";

      if (
        /does not exist|could not find the table|schema cache/i.test(message)
      ) {
        report(`Table: ${table}`, "FAIL", message);
        failures++;
      } else if (
        /permission denied|row.level security|not allowed|unauthorized|forbidden/i.test(
          message
        )
      ) {
        report(`Table: ${table}`, "WARN", "Access denied by permissions/RLS");
        warnings++;
      } else {
        report(`Table: ${table}`, "FAIL", message);
        failures++;
      }
    } catch (error) {
      report(`Table: ${table}`, "FAIL", error.message);
      failures++;
    }
  }

  async function checkColumn(table, column) {
    try {
      const { error } = await supabase
        .from(table)
        .select(column)
        .limit(1);

      if (!error) {
        report(`Column: ${table}.${column}`, "PASS", "Column is queryable");
        return;
      }

      const message = error.message || "Unknown database error";

      if (
        /column .* does not exist|could not find .* column|schema cache/i.test(
          message
        )
      ) {
        report(`Column: ${table}.${column}`, "FAIL", "Column missing");
        failures++;
      } else if (
        /permission denied|row.level security|not allowed|unauthorized|forbidden/i.test(
          message
        )
      ) {
        report(
          `Column: ${table}.${column}`,
          "WARN",
          "Cannot verify because access is denied"
        );
        warnings++;
      } else {
        report(`Column: ${table}.${column}`, "FAIL", message);
        failures++;
      }
    } catch (error) {
      report(`Column: ${table}.${column}`, "FAIL", error.message);
      failures++;
    }
  }

  console.log("\n--- Database tables ---");

  for (const table of [
    "products",
    "service_logs",
    "reminders",
    "brands",
    "device_types",
  ]) {
    await checkTable(table);
  }

  console.log("\n--- Required ownership columns ---");

  for (const table of [
    "products",
    "service_logs",
    "reminders",
  ]) {
    await checkColumn(table, "user_id");
  }

  console.log("\n--- Demo user configuration ---");

  const databaseFile = path.join(
    ROOT,
    "src",
    "database",
    "database.js"
  );

  if (!fs.existsSync(databaseFile)) {
    report("database.js", "WARN", "File not found at expected path");
    warnings++;
  } else {
    const source = fs.readFileSync(databaseFile, "utf8");

    const match = source.match(
      /(?:const|let|var)\s+DEMO_USER_ID\s*=\s*["']([^"']+)["']/
    );

    if (!match) {
      report("DEMO_USER_ID", "WARN", "Could not find its declaration");
      warnings++;
    } else if (match[1] !== EXPECTED_DEMO_USER) {
      report(
        "DEMO_USER_ID",
        "WARN",
        "Configured UUID differs from the newly created user"
      );
      warnings++;
    } else {
      report("DEMO_USER_ID", "PASS", "Configured UUID matches");
    }

    const declarations = source.match(
      /(?:const|let|var)\s+DEMO_USER_ID\s*=/g
    ) || [];

    if (declarations.length > 1) {
      report(
        "DEMO_USER_ID declarations",
        "FAIL",
        "Multiple declarations found; remove duplicates"
      );
      failures++;
    }
  }

  console.log("\n==================================");
  console.log("           TEST SUMMARY");
  console.log("==================================");
  console.log(`Failures: ${failures}`);
  console.log(`Warnings: ${warnings}`);

  if (failures > 0) {
    console.log("\nRESULT: FIX THE FAILURES ABOVE");
    process.exitCode = 1;
  } else if (warnings > 0) {
    console.log("\nRESULT: REVIEW WARNINGS");
  } else {
    console.log("\nRESULT: BASIC CHECKS PASSED");
  }

  console.log(
    "\nNote: This test does not create or modify database records."
  );
  console.log(
    "It does not verify demo-user existence or prove the entire app works."
  );
}

main().catch((error) => {
  console.error("\nHealth check failed:", error.message);
  process.exitCode = 1;
});