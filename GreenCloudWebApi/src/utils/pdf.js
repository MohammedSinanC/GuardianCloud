import puppeteer from "puppeteer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Handlebars helpers used by the document templates
handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
handlebars.registerHelper("fmt", (n) => Number(n || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
handlebars.registerHelper("fmtDate", (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"));

// Browser instance is cached — launching Chromium per request is too slow
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserPromise;
}

/**
 * Compile a Handlebars template by name from src/templates/.
 * Cached after first compile.
 */
const templateCache = new Map();

export function compileTemplate(templateName) {
  if (!templateCache.has(templateName)) {
    const file = path.join(__dirname, "..", "templates", `${templateName}.hbs`);
    const source = fs.readFileSync(file, "utf-8");
    templateCache.set(templateName, handlebars.compile(source));
  }
  return templateCache.get(templateName);
}

/**
 * Render a Handlebars template to an HTML string.
 */
export function renderHtml(templateName, data) {
  const compiled = compileTemplate(templateName);
  return compiled(data);
}

/**
 * Render HTML to a PDF buffer via headless Chromium.
 */
export async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    return pdf;
  } finally {
    await page.close();
  }
}

/**
 * Full pipeline: template + data → HTML → PDF buffer.
 */
export async function generatePdf(templateName, data) {
  const html = renderHtml(templateName, data);
  return renderPdf(html);
}
