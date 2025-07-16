// NBR Document Scraper
import puppeteer, { Browser, Page } from "puppeteer";
import { DocumentMetadata, NBRDocument, ScrapingResult } from "../types";
import { PipelineConfig } from "../config/pipeline-config";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

export class NBRScraper {
  private browser: Browser | null = null;
  private baseUrls = PipelineConfig.NBR_URLS;
  private documentTypes = PipelineConfig.DOCUMENT_TYPES;
  private scrapingStats = {
    totalFound: 0,
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  constructor(private options = PipelineConfig.getDefaultOptions()) {}

  /**
   * Initialize the scraper with Puppeteer browser
   */
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--lang=bn,en", // Support for Bengali and English
      ],
    });
  }

  /**
   * Scrape all NBR documents from configured URLs
   */
  async scrapeAllDocuments(): Promise<ScrapingResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const allDocuments: DocumentMetadata[] = [];

    // Scrape each URL category
    for (const [category, url] of Object.entries(this.baseUrls)) {
      try {
        console.log(`Scraping ${category} from ${url}`);
        const documents = await this.scrapeDocumentsFromUrl(url, category);
        allDocuments.push(...documents);
        this.scrapingStats.processed += documents.length;
      } catch (error) {
        const errorMsg = `Failed to scrape ${category}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(errorMsg);
        this.scrapingStats.errors.push(errorMsg);
        this.scrapingStats.failed++;
      }
    }

    await this.cleanup();

    return {
      documents: allDocuments,
      total_found: this.scrapingStats.totalFound,
      processed: this.scrapingStats.processed,
      failed: this.scrapingStats.failed,
      errors: this.scrapingStats.errors,
    };
  }

  /**
   * Scrape documents from a specific URL
   */
  private async scrapeDocumentsFromUrl(
    url: string,
    category: string
  ): Promise<DocumentMetadata[]> {
    if (!this.browser) throw new Error("Browser not initialized");

    const page = await this.browser.newPage();
    const documents: DocumentMetadata[] = [];

    try {
      // Set user agent and language preferences
      await page.setUserAgent(
        "Mozilla/5.0 (compatible; NBR-Scraper; +https://ai-tax-lawyer.com)"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "bn,en-US;q=0.9,en;q=0.8",
      });

      // Navigate to the page
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: PipelineConfig.PERFORMANCE_CONFIG.DOWNLOAD_TIMEOUT,
      });

      // Wait for content to load
      await page.waitForSelector("body", { timeout: 10000 });

      // Extract PDF links and document information
      const pdfLinks = await page.evaluate(() => {
        const links = Array.from(
          document.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"]')
        );
        return links.map((link) => {
          const href = link.getAttribute("href");
          const text = link.textContent?.trim() || "";
          const title = link.getAttribute("title") || text;

          return {
            url: href?.startsWith("http")
              ? href
              : new URL(href || "", window.location.origin).href,
            title,
            text,
            parentText: link.parentElement?.textContent?.trim() || "",
          };
        });
      });

      // Process each PDF link
      for (const link of pdfLinks) {
        try {
          const metadata = await this.createDocumentMetadata(link, category);
          documents.push(metadata);
          this.scrapingStats.totalFound++;
        } catch (error) {
          console.error(`Failed to process link ${link.url}:`, error);
          this.scrapingStats.errors.push(
            `Failed to process ${link.url}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Look for additional document links in tables or lists
      const additionalLinks = await this.findAdditionalDocumentLinks(page);
      for (const link of additionalLinks) {
        try {
          const metadata = await this.createDocumentMetadata(link, category);
          documents.push(metadata);
          this.scrapingStats.totalFound++;
        } catch (error) {
          console.error(
            `Failed to process additional link ${link.url}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }

    return documents;
  }

  /**
   * Find additional document links from structured content
   */
  private async findAdditionalDocumentLinks(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const additionalLinks: any[] = [];

      // Look for documents in tables
      const tables = document.querySelectorAll("table");
      tables.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, th");
          cells.forEach((cell) => {
            const links = cell.querySelectorAll(
              'a[href*=".pdf"], a[href*=".PDF"]'
            );
            links.forEach((link) => {
              const href = link.getAttribute("href");
              const text = link.textContent?.trim() || "";

              if (href && text) {
                additionalLinks.push({
                  url: href.startsWith("http")
                    ? href
                    : new URL(href, window.location.origin).href,
                  title: text,
                  text,
                  parentText: cell.textContent?.trim() || "",
                });
              }
            });
          });
        });
      });

      // Look for documents in lists
      const lists = document.querySelectorAll("ul, ol");
      lists.forEach((list) => {
        const items = list.querySelectorAll("li");
        items.forEach((item) => {
          const links = item.querySelectorAll(
            'a[href*=".pdf"], a[href*=".PDF"]'
          );
          links.forEach((link) => {
            const href = link.getAttribute("href");
            const text = link.textContent?.trim() || "";

            if (href && text) {
              additionalLinks.push({
                url: href.startsWith("http")
                  ? href
                  : new URL(href, window.location.origin).href,
                title: text,
                text,
                parentText: item.textContent?.trim() || "",
              });
            }
          });
        });
      });

      return additionalLinks;
    });
  }

  /**
   * Create document metadata from scraped link
   */
  private async createDocumentMetadata(
    link: any,
    category: string
  ): Promise<DocumentMetadata> {
    const id = createHash("md5").update(link.url).digest("hex");
    const documentType = this.detectDocumentType(
      link.title,
      link.url,
      category
    );
    const language = this.detectLanguage(link.title, link.text);
    const year = this.extractYear(link.title, link.text);
    const tags = this.extractTags(link.title, link.text, link.parentText);

    return {
      id,
      title: link.title,
      source_url: link.url,
      document_type: documentType,
      language,
      year,
      file_size: 0, // Will be determined during download
      scraped_at: new Date(),
      tags,
    };
  }

  /**
   * Detect document type from title and URL
   */
  private detectDocumentType(
    title: string,
    url: string,
    category: string
  ): DocumentMetadata["document_type"] {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    // Check URL patterns first
    for (const [type, config] of Object.entries(this.documentTypes)) {
      if (config.url_pattern.test(urlLower)) {
        return type as DocumentMetadata["document_type"];
      }
    }

    // Check keywords in title
    for (const [type, config] of Object.entries(this.documentTypes)) {
      if (
        config.keywords.some((keyword) =>
          titleLower.includes(keyword.toLowerCase())
        )
      ) {
        return type as DocumentMetadata["document_type"];
      }
    }

    // Fallback based on category
    const categoryMapping: {
      [key: string]: DocumentMetadata["document_type"];
    } = {
      FINANCE_ACTS: "finance-act",
      INCOME_TAX_ACTS: "income-tax-act",
      VAT_ACTS: "vat-act",
      CUSTOMS_ACTS: "customs-act",
      SRO_CIRCULARS: "sro",
      CIRCULARS: "circular",
    };

    return categoryMapping[category] || "circular";
  }

  /**
   * Detect language from title and text
   */
  private detectLanguage(title: string, text: string): "bn" | "en" | "mixed" {
    const combinedText = `${title} ${text}`;
    const bengaliChars = combinedText.match(/[\u0980-\u09FF]/g) || [];
    const englishChars = combinedText.match(/[a-zA-Z]/g) || [];

    const bengaliRatio = bengaliChars.length / combinedText.length;
    const englishRatio = englishChars.length / combinedText.length;

    if (bengaliRatio > 0.5) return "bn";
    if (englishRatio > 0.5) return "en";
    if (bengaliRatio > 0.1 && englishRatio > 0.1) return "mixed";

    return "en"; // Default to English
  }

  /**
   * Extract year from title or text
   */
  private extractYear(title: string, text: string): number | undefined {
    const combinedText = `${title} ${text}`;

    // Look for 4-digit years
    const yearMatch = combinedText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return parseInt(yearMatch[0]);
    }

    // Look for Bengali numerals
    const bengaliYearMatch = combinedText.match(/[১২][০-৯]{3}/);
    if (bengaliYearMatch) {
      const bengaliYear = bengaliYearMatch[0];
      const englishYear = this.convertBengaliToEnglishNumber(bengaliYear);
      return parseInt(englishYear);
    }

    return undefined;
  }

  /**
   * Convert Bengali numerals to English
   */
  private convertBengaliToEnglishNumber(bengaliNumber: string): string {
    const bengaliToEnglish: { [key: string]: string } = {
      "০": "0",
      "১": "1",
      "২": "2",
      "৩": "3",
      "৪": "4",
      "৫": "5",
      "৬": "6",
      "৭": "7",
      "৮": "8",
      "৯": "9",
    };

    return bengaliNumber.replace(/[০-৯]/g, (match) => bengaliToEnglish[match]);
  }

  /**
   * Extract tags from document text
   */
  private extractTags(
    title: string,
    text: string,
    parentText: string
  ): string[] {
    const combinedText = `${title} ${text} ${parentText}`.toLowerCase();
    const tags: string[] = [];

    // Common tax-related tags
    const tagPatterns = [
      { pattern: /finance|অর্থ|বাজেট/, tag: "finance" },
      { pattern: /income.*tax|আয়কর/, tag: "income-tax" },
      { pattern: /vat|মূসক/, tag: "vat" },
      { pattern: /customs|শুল্ক/, tag: "customs" },
      { pattern: /sro|নিয়মাবলী/, tag: "sro" },
      { pattern: /circular|বিজ্ঞপ্তি/, tag: "circular" },
      { pattern: /amendment|সংশোধনী/, tag: "amendment" },
      { pattern: /rule|বিধি/, tag: "rule" },
      { pattern: /act|আইন/, tag: "act" },
      { pattern: /order|আদেশ/, tag: "order" },
    ];

    for (const { pattern, tag } of tagPatterns) {
      if (pattern.test(combinedText)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Download a document from URL
   */
  async downloadDocument(metadata: DocumentMetadata): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();

    try {
      // Set download path
      const downloadPath = path.join(
        process.cwd(),
        PipelineConfig.STORAGE_CONFIG.TEMP_DIR
      );
      await fs.mkdir(downloadPath, { recursive: true });

      // Navigate to the PDF URL
      const response = await page.goto(metadata.source_url, {
        waitUntil: "networkidle2",
        timeout: PipelineConfig.PERFORMANCE_CONFIG.DOWNLOAD_TIMEOUT,
      });

      if (!response || !response.ok()) {
        throw new Error(
          `Failed to download: ${response?.status()} ${response?.statusText()}`
        );
      }

      // Get the PDF buffer
      const buffer = await response.buffer();

      // Update file size in metadata
      metadata.file_size = buffer.length;

      return buffer;
    } catch (error) {
      console.error(`Error downloading ${metadata.source_url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    return { ...this.scrapingStats };
  }
}
