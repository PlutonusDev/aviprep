import "dotenv/config";
import { extractText } from "unpdf";
import fs from "node:fs/promises";
import { MongoClient } from "mongodb";
import { embedMany } from "ai";

interface Chunk {
  text: string;
  metadata: {
    unit: string;
    section: string;
    hierarchy: string;
  };
}

export async function ingestAviationPDF(pdfBuffer: Buffer) {
  const uint8Array = new Uint8Array(pdfBuffer);
  const { text } = await extractText(uint8Array);

  // DEBUG: See if text is actually being extracted
  if (!text || text.length < 100) {
    console.error("PDF extraction failed or returned nearly no text.");
    return [];
  }
  const chunks: any[] = [];

  let currentUnit = "General";
  let currentSection = "Introduction";
  let currentContent: string[] = [];

  const unitRegex = /Unit\s+(\d+\.\d+\.\d+)/i;
  const sectionNumberRegex = /^(\d+\.\d+(?:\.\d+)?)\s+/;

  for (const pageText of text) {
    const cleanedPage = pageText
      .replace(/Page \d+ of \d+ pages/gi, '')
      .replace(/Schedule 3 Part 61 Manual of Standards Aeronautical knowledge standards/gi, '')
      .replace(/Authorised Version [A-Z0-9 ]+ registered \d+\/\d+\/\d+/gi, '')
      .replace(/"/g, '');

    const lines = cleanedPage.split("\n");

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const unitMatch = trimmed.match(unitRegex);
      const sectionMatch = trimmed.match(sectionNumberRegex);

      if (unitMatch) {
        // Save what we have before switching units
        if (currentContent.length > 0) {
          pushChunk(chunks, currentUnit, currentSection, currentContent);
        }
        currentUnit = unitMatch[0];
        currentSection = "Introduction";
        currentContent = [];
      }
      else if (sectionMatch) {
        // Save what we have before switching sections
        if (currentContent.length > 0) {
          pushChunk(chunks, currentUnit, currentSection, currentContent);
        }
        currentSection = trimmed;
        currentContent = [];
      }
      else {
        // Add line to the ongoing content of the current section
        currentContent.push(trimmed);
      }
    }
  }

  if (currentContent.length > 0) {
    pushChunk(chunks, currentUnit, currentSection, currentContent);
  }

  return chunks;
}

function pushChunk(chunks: any[], unit: string, section: string, content: string[]) {
  const fullText = content.join(' ');
  if (fullText.toLowerCase().includes("reserved")) return;

  chunks.push({
    text: `[${unit}] ${section} ${fullText}`,
    metadata: { unit: unit.trim(), section: section.trim() }
  });
}

export async function uploadToAtlas(chunks: any[]) {
  const client = new MongoClient(process.env.DATABASE_URL);

  try {
    await client.connect();
    const db = client.db("vectors");
    const collection = db.collection("part61-mos");

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    const { embeddings } = await embedMany({
      model: "openai/text-embedding-3-small",
      values: chunks.map(chunk => chunk.text),
    });

    const docs = chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        indexedAt: new Date()
      },
    }));

    const result = await collection.insertMany(docs);

    console.log(`Uploaded ${result.insertedCount} vectors to Atlas.`);
  } finally {
    await client.close();
  }
}

async function read() {
  console.log(`Reading PDF...`);
  const pdfFile = await fs.readFile("./scripts/doc/casr-part-61-mos-aeronautical-knowledge-requirements-prior-to-19-november-2024.pdf");
  const chunks = await ingestAviationPDF(pdfFile);
  console.log(`Calling Atlas...`);
  await uploadToAtlas(chunks);
  console.log(`Script done.`);
}

read();