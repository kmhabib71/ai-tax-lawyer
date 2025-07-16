import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import axios from "axios";
import pdfParse from "pdf-parse";

interface PDFProcessingResult {
  url: string;
  title: string;
  content: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const startTime = Date.now();

    // Step 1: Scrape the webpage to find PDF links
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        "Mozilla/5.0 (compatible; NBR-Scraper; +https://ai-tax-lawyer.com)"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "bn,en-US;q=0.9,en;q=0.8",
      });

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await page.waitForSelector("body", { timeout: 10000 });

      // Extract PDF links and page info
      const pageData = await page.evaluate(() => {
        const title =
          document.title ||
          document.querySelector("h1")?.textContent?.trim() ||
          "NBR Document";

        // Find all PDF links with better selectors
        const pdfLinks = Array.from(
          document.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"]')
        ).map((link) => {
          const href = link.getAttribute("href");
          const text = link.textContent?.trim() || "";
          const fullUrl = href?.startsWith("http")
            ? href
            : new URL(href || "", window.location.origin).href;

          return {
            url: fullUrl,
            title: text,
            text: text,
          };
        });

        // Also check for table rows with PDF links
        const tableRows = Array.from(document.querySelectorAll("tr"))
          .map((row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const pdfLink = row.querySelector(
              'a[href*=".pdf"], a[href*=".PDF"]'
            );

            if (pdfLink) {
              const href = pdfLink.getAttribute("href");
              const fullUrl = href?.startsWith("http")
                ? href
                : new URL(href || "", window.location.origin).href;

              return {
                url: fullUrl,
                title:
                  cells[1]?.textContent?.trim() ||
                  pdfLink.textContent?.trim() ||
                  "PDF Document",
                date: cells[2]?.textContent?.trim() || "",
                text: cells.map((cell) => cell.textContent?.trim()).join(" | "),
              };
            }
            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        return {
          title,
          pdfLinks: [...pdfLinks, ...tableRows].filter(Boolean),
        };
      });

      await browser.close();

      if (pageData.pdfLinks.length === 0) {
        return NextResponse.json(
          {
            error: "No PDF documents found on this page",
            pageTitle: pageData.title,
            suggestion:
              "This page may not contain direct PDF links. Try a different NBR URL.",
          },
          { status: 404 }
        );
      }

      // Step 2: Download and process PDFs (limit to first 3 for testing)
      const pdfsToProcess = pageData.pdfLinks.slice(0, 3);
      const pdfResults: PDFProcessingResult[] = [];

      for (const pdfLink of pdfsToProcess) {
        try {
          console.log(`Downloading PDF: ${pdfLink.url}`);

          // Download PDF with timeout
          const response = await axios.get(pdfLink.url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; NBR-Scraper; +https://ai-tax-lawyer.com)",
              Accept: "application/pdf",
            },
          });

          if (response.status === 200 && response.data) {
            // Parse PDF
            const pdfBuffer = Buffer.from(response.data);
            const pdfData = await pdfParse(pdfBuffer);

            pdfResults.push({
              url: pdfLink.url,
              title: pdfLink.title,
              content: pdfData.text,
              pageCount: pdfData.numpages,
              success: true,
            });
          } else {
            pdfResults.push({
              url: pdfLink.url,
              title: pdfLink.title,
              content: "",
              pageCount: 0,
              success: false,
              error: `Failed to download: HTTP ${response.status}`,
            });
          }
        } catch (pdfError) {
          console.error(`Error processing PDF ${pdfLink.url}:`, pdfError);
          pdfResults.push({
            url: pdfLink.url,
            title: pdfLink.title,
            content: "",
            pageCount: 0,
            success: false,
            error:
              pdfError instanceof Error ? pdfError.message : "Unknown error",
          });
        }
      }

      // Step 3: Analyze processed content
      const processingTime = (Date.now() - startTime) / 1000;

      // Combine all successful PDF content
      const combinedContent = pdfResults
        .filter((pdf) => pdf.success)
        .map((pdf) => pdf.content)
        .join("\n\n");

      const bengaliCharacters = (
        combinedContent.match(/[\u0980-\u09FF]/g) || []
      ).length;
      const englishCharacters = (combinedContent.match(/[a-zA-Z]/g) || [])
        .length;
      const wordCount = combinedContent
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length;

      // Create chunks from PDF content
      const chunks = combinedContent
        .split(/\n\s*\n/)
        .filter((chunk: string) => chunk.trim().length > 50)
        .slice(0, 10);

      // Calculate confidence based on PDF processing success
      let confidence = 0.3; // Base confidence
      const successfulPdfs = pdfResults.filter((pdf) => pdf.success).length;
      const totalPdfs = pdfResults.length;

      if (successfulPdfs > 0) confidence += 0.3;
      if (wordCount > 500) confidence += 0.2;
      if (bengaliCharacters > 0) confidence += 0.2;
      if (successfulPdfs / totalPdfs > 0.5) confidence += 0.1;

      // Determine document type
      let documentType = "unknown";
      if (url.includes("income-tax")) documentType = "income-tax-act";
      if (url.includes("vat")) documentType = "vat-act";
      if (url.includes("finance")) documentType = "finance-act";
      if (url.includes("customs")) documentType = "customs-act";
      if (url.includes("sro")) documentType = "sro";
      if (url.includes("circular")) documentType = "circular";

      // Prepare response
      const response = {
        url,
        title: pageData.title,
        content:
          combinedContent.substring(0, 8000) +
          (combinedContent.length > 8000 ? "..." : ""),
        chunks,
        metadata: {
          type: documentType,
          language:
            bengaliCharacters > englishCharacters ? "Bengali" : "English",
          confidence: Math.min(confidence, 1.0),
          wordCount,
          processingTime,
          bengaliCharacters,
          englishCharacters,
        },
        // PDF processing details
        pdfProcessing: {
          totalPdfsFound: pageData.pdfLinks.length,
          pdfsProcessed: pdfResults.length,
          successfulPdfs,
          failedPdfs: totalPdfs - successfulPdfs,
          results: pdfResults,
        },
        embeddings: null,
      };

      return NextResponse.json(response);
    } catch (pageError) {
      await browser.close();
      throw pageError;
    }
  } catch (error) {
    console.error("Error in test-scraping API:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process URL: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

// GET endpoint remains the same
export async function GET() {
  const testUrls = [
    {
      url: "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban",
      description: "Income Tax Acts (Bengali)",
      category: "আয়কর আইন",
    },
    {
      url: "https://nbr.gov.bd/regulations/acts/vat-acts/ban",
      description: "VAT Acts (Bengali)",
      category: "মূসক আইন",
    },
    {
      url: "https://nbr.gov.bd/regulations/acts/finance-acts/ban",
      description: "Finance Acts (Bengali)",
      category: "অর্থ আইন",
    },
    {
      url: "https://nbr.gov.bd/regulations/acts/customs-acts/ban",
      description: "Customs Acts (Bengali)",
      category: "কাস্টমস আইন",
    },
    {
      url: "https://nbr.gov.bd/regulations/sro/income-tax-sro/ban",
      description: "Income Tax SROs (Bengali)",
      category: "আয়কর এসআরও",
    },
    {
      url: "https://nbr.gov.bd/regulations/circulars/income-tax-circulars/ban",
      description: "Income Tax Circulars (Bengali)",
      category: "আয়কর সার্কুলার",
    },
  ];

  return NextResponse.json({ testUrls });
}
