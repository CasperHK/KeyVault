import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourceRoot = new URL("../src/", import.meta.url);

function compile(relativePath, globals = {}, dependencies = {}) {
  const filename = fileURLToPath(new URL(relativePath, sourceRoot));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(
    outputText,
    {
      exports,
      require: (name) => dependencies[name] ?? require(name),
      ...globals,
    },
    { filename }
  );
  return exports;
}

const { zhHant } = compile("lib/messages/zh-Hant.ts");

function runtime({ saved = null, languages = ["en-US"], blockedStorage = false } = {}) {
  const writes = [];
  const warnings = [];
  const storage = {
    getItem: () => {
      if (blockedStorage) throw new Error("Storage disabled");
      return saved;
    },
    setItem: (key, value) => {
      if (blockedStorage) throw new Error("Storage disabled");
      writes.push([key, value]);
    },
  };
  const api = compile(
    "lib/i18n.ts",
    {
      window: { localStorage: storage },
      navigator: { languages },
      console: { warn: (...args) => warnings.push(args) },
    },
    { "./messages/zh-Hant": { zhHant } }
  );
  return { ...api, writes, warnings };
}

test("first visit follows supported browser languages with an English fallback", () => {
  for (const language of ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW", "zh"]) {
    const app = runtime({ languages: [language] });
    assert.equal(app.t("Work email"), "工作電郵");
    assert.equal(app.formatLocale(), "zh-TW");
  }
  for (const languages of [["en-US", "zh-TW"], ["fr-FR"], ["zh-CN"], []]) {
    assert.equal(runtime({ languages }).t("Work email"), "Work email");
  }
  assert.equal(runtime().browserLocale(["fr-FR", "zh-HK"]), "zh-Hant");
});

test("a saved preference overrides browser language; invalid values do not", () => {
  assert.equal(runtime({ saved: "en", languages: ["zh-TW"] }).t("Work email"), "Work email");
  assert.equal(runtime({ saved: "zh-Hant" }).t("Work email"), "工作電郵");
  assert.equal(runtime({ saved: "unsupported", languages: ["zh-TW"] }).t("Work email"), "工作電郵");
});

test("switches both ways, persists the choice and interpolates complete sentences", () => {
  const app = runtime();
  app.setLocale("zh-Hant");
  assert.equal(app.t("Manage {name}", { name: "Server <01>" }), "管理 Server <01>");
  assert.equal(
    app.t("Showing {start}-{end} of {total} {type}", {
      start: 1,
      end: 8,
      total: 25,
      type: app.t("assets"),
    }),
    "顯示第 1–8 筆，共 25 項資產"
  );
  assert.equal(app.t("Missing {value}", { value: 0 }), "Missing 0");
  assert.equal(app.t("Missing {value}", {}), "Missing {value}");
  app.setLocale("en");
  assert.equal(app.t("Work email"), "Work email");
  assert.equal(app.formatLocale(), "en");
  assert.deepEqual(app.writes, [
    ["keyvault.language", "zh-Hant"],
    ["keyvault.language", "en"],
  ]);
});

test("storage failures are reported and language switching still works for the session", () => {
  const app = runtime({ blockedStorage: true });
  assert.equal(app.warnings.length, 1);
  app.setLocale("zh-Hant");
  assert.equal(app.t("Work email"), "工作電郵");
  assert.equal(app.warnings.length, 2);
});

test("all catalogue entries are nonempty and retain exactly the English placeholders", () => {
  const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [english, chinese] of Object.entries(zhHant)) {
    assert.ok(chinese.trim(), english);
    assert.deepEqual(placeholders(chinese), placeholders(english), english);
  }
});

const surfaces = [
  "routes/__root.tsx",
  "routes/_site/index.tsx",
  "routes/login.tsx",
  "routes/dashboard.tsx",
  "components/staff-detail.tsx",
  "components/service-detail.tsx",
  "components/keyvault-ui.tsx",
  "components/language-selector.tsx",
  "components/buttons/ScrollTopButton.tsx",
  "components/dialogs/BaseDialog.tsx",
  "components/dialogs/InventoryEditorDialog.tsx",
  "components/dialogs/AssetDialog.tsx",
  "components/dialogs/StaffDialog.tsx",
  "components/dialogs/ServiceDialog.tsx",
  "lib/inventory.ts",
];

test("every literal translation used by the main UI has a Traditional Chinese entry", () => {
  for (const relativePath of surfaces) {
    const filename = fileURLToPath(new URL(relativePath, sourceRoot));
    const ast = ts.createSourceFile(
      filename,
      readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const visit = (node) => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === "t") {
        const first = node.arguments[0];
        if (first && ts.isStringLiteral(first)) {
          assert.ok(Object.hasOwn(zhHant, first.text), `${relativePath}: ${first.text}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
});

test("canonical enum values and dynamic resource messages have translations", () => {
  for (const key of [
    "Laptop",
    "Desktop",
    "Server",
    "Mobile",
    "Network",
    "Laptops",
    "Desktops",
    "Servers",
    "Networks",
    "In use",
    "Available",
    "Maintenance",
    "Retired",
    "Running",
    "Stopped",
    "Production",
    "Staging",
    "Development",
    "Healthy",
    "Unhealthy",
    "Unknown",
    "Add asset",
    "Add staff member",
    "Add service",
    "Manage asset",
    "Manage staff member",
    "Manage service",
    "Asset added to your workspace.",
    "Staff member added to your workspace.",
    "Service added to your workspace.",
    "{count} asset needs a check-in",
    "{count} assets need a check-in",
    "{count} warranty needs a look",
    "{count} warranties need a look",
    "Warranty expired {date}",
    "Warranty expires {date}",
  ]) {
    assert.ok(Object.hasOwn(zhHant, key), key);
    assert.notEqual(zhHant[key], key, key);
  }
});

test("CSV headings localize while arbitrary content, paths, and identifiers stay unchanged", () => {
  const app = runtime({ saved: "zh-Hant" });
  assert.equal(app.t("Installation path"), "安裝路徑");
  for (const text of [
    "C:\\Services\\KeyVault",
    "https://example.com/health",
    "KV-SV-001",
    "Alex Morgan",
    "toString",
    "__proto__",
  ]) {
    assert.equal(app.t(text), text);
  }
});

test("CSV export translates headers only and preserves escaping and formula protection", async () => {
  const app = runtime({ saved: "zh-Hant" });
  let captured;
  let clicked = false;
  let revoked = false;
  const inventory = compile(
    "lib/inventory.ts",
    {
      Blob,
      URL: {
        createObjectURL: (blob) => {
          captured = blob;
          return "blob:test";
        },
        revokeObjectURL: () => {
          revoked = true;
        },
      },
      document: {
        createElement: () => ({
          click: () => {
            clicked = true;
          },
        }),
      },
    },
    { "./api": { api: {} }, "./i18n": { t: app.t } }
  );
  inventory.downloadCSV("test", [
    ["Name", "Status", "Installation path"],
    ["Available", "Running", "C:\\Services\\KeyVault"],
    ["=SUM(1,2)", 'A "quoted" name', "line 1\nline 2"],
  ]);
  const content = await captured.text();
  assert.ok(content.includes('"名稱","狀態","安裝路徑"'));
  assert.ok(content.includes('"Available","Running","C:\\Services\\KeyVault"'));
  assert.ok(content.includes(`"'=SUM(1,2)","A ""quoted"" name","line 1\nline 2"`));
  assert.equal(clicked, true);
  assert.equal(revoked, true);
});

test("known API failures translate at render time, including after switching language", () => {
  const app = runtime({ saved: "zh-Hant" });
  const { errorMessage } = compile(
    "lib/inventory.ts",
    {},
    {
      "./api": { api: {} },
      "./i18n": { t: app.t },
    }
  );
  const failure = {
    isAxiosError: true,
    response: {
      status: 401,
      data: { error: { message: "Invalid email or password" } },
    },
  };
  assert.equal(errorMessage(failure), "電郵或密碼不正確");
  app.setLocale("en");
  assert.equal(errorMessage(failure), "Invalid email or password");
});
