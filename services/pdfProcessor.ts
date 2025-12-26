import * as pdfjsLib from 'pdfjs-dist';
import FlexSearch from 'flexsearch';
import { saveFullText, getAllFullTexts, getAllPapers } from './storageService';
import { Paper } from '../types';

// Ensure worker is set (redundant check, but safe)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

// --- Persian Normalization Utils ---
// PDFs often encode Persian characters using Arabic glyphs or variations.
// We must normalize them to standard Persian Unicode for the search to work.
const normalizePersian = (text: string): string => {
    if (!text) return "";
    return text
        // 1. Standardize Yeh (Arabic/Persian variations -> Persian Ye)
        .replace(/[\u064A\u0649\u06CC\u06D0\u06D2\u06D3]/g, '\u06CC')
        // 2. Standardize Kaf (Arabic/Persian variations -> Persian Ke)
        .replace(/[\u0643\u06A9\u06AC\u06AD\u06AE\u06AF]/g, '\u06A9') // Note: includes Gaf mapping just in case of font encoding errors, but usually Kaf is the main issue. strictly we should keep Gaf separate, but mapped Kafs: \u0643 (Arabic) -> \u06A9 (Persian)
        .replace(/\u0643/g, '\u06A9') 
        // 3. Remove Tatweel (Kashida) - decorative lines
        .replace(/\u0640/g, '')
        // 4. Normalize ZWNJ (Zero Width Non-Joiner) to standard space for easier searching? 
        // Actually, removing ZWNJ often helps search: "می‌شود" -> "میشود". 
        // Or replacing with space: "می شود".
        // Let's replace with space to ensure tokens are split if the user doesn't type ZWNJ.
        .replace(/\u200C/g, ' ') 
        // 5. General whitespace cleanup
        .replace(/\s+/g, ' ')
        .trim();
};

// Initialize FlexSearch Index
let searchIndex: any = null;

const initSearchIndex = async () => {
    if (searchIndex) return searchIndex;

    // CRITICAL FIX: Removed 'charset: "latin:advanced"'
    // We use a custom encoder to support Mixed Persian/English content.
    searchIndex = new FlexSearch.Document({
        document: {
            id: "id",
            index: ["content", "title", "authors"],
            store: true // We store text to display snippets
        },
        // 'forward' tokenization helps with partial matches "Gar" -> "Garden", "با" -> "باغ"
        tokenize: "forward", 
        // Custom Encoder to handle Persian + English case insensitivity
        encode: (str: string) => {
            if (!str) return [];
            // Normalize: Lowercase for English, Character map for Persian
            const normalized = normalizePersian(str.toLowerCase());
            // Split by non-word characters (keeping Persian letters as words)
            // The regex splits on anything that is NOT a word char or Persian char
            return normalized.split(/[\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^`{|}~]+/);
        },
        context: {
            resolution: 9,
            depth: 3,
            bidirectional: true
        }
    });

    // Hydrate index from IndexedDB (load previously saved texts)
    const storedTexts = await getAllFullTexts();
    console.log(`Hydrating search index with ${storedTexts.length} documents...`);
    
    storedTexts.forEach(doc => {
        // We re-normalize during hydration to ensure consistency
        searchIndex.add({
            id: doc.id,
            content: normalizePersian(doc.text)
        });
    });

    return searchIndex;
};

/**
 * Extracts text from a PDF ArrayBuffer.
 * This acts as our "Digital OCR" - most academic PDFs have text layers.
 */
export const extractTextFromPDF = async (pdfData: Uint8Array): Promise<string> => {
    try {
        const loadingTask = pdfjsLib.getDocument({ 
            data: pdfData,
            // Enable CMap loading to correctly map generic glyphs to Unicode characters (Crucial for Persian)
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
            // ADDED: Standard Font Data URL to ensure fonts are mapped correctly during extraction
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
        });
        
        const doc = await loadingTask.promise;
        let fullText = "";

        // Loop through all pages
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            
            // Text extraction strategy:
            // PDF.js returns items. In Persian PDFs, sometimes words are split or reversed visually.
            // A simple join(' ') is usually sufficient for a "Bag of Words" search index.
            // We apply normalization immediately.
            
            const pageItems = textContent.items.map((item: any) => item.str).join(' ');
            
            // Add to full text with a page marker (optional, for debugging)
            fullText += ` ${pageItems} `;
        }
        
        const cleanText = normalizePersian(fullText);
        console.log(`Extracted ${cleanText.length} chars. Sample: ${cleanText.substring(0, 50)}...`);
        
        return cleanText;
    } catch (e) {
        console.error("Text extraction failed:", e);
        return ""; // Return empty string on failure (e.g. password protected or image-only)
    }
};

/**
 * Processes a new PDF: Extracts text, Saves to DB, Updates Index
 */
export const processAndIndexPaper = async (paperId: string, title: string, authors: string[], file: File) => {
    try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        
        // 1. Extract
        const extractedText = await extractTextFromPDF(data);
        
        if (!extractedText.trim()) {
            console.warn("No text extracted. Document might be an image-only scan.");
            return; 
        }

        // 2. Save to DB (We save the raw extracted text)
        await saveFullText(paperId, extractedText);

        // 3. Add to Active Index
        const index = await initSearchIndex();
        index.add({
            id: paperId,
            title: normalizePersian(title),
            authors: normalizePersian(authors.join(' ')),
            content: extractedText
        });

        console.log(`Indexed ${paperId} successfully.`);
    } catch (e) {
        console.error("Processing failed", e);
    }
};

/**
 * Performs a Full-Text Search
 */
export const searchFullText = async (query: string): Promise<string[]> => {
    const index = await initSearchIndex();
    const normalizedQuery = normalizePersian(query);
    
    // Search in content, title, and authors
    // limit: 20 results
    const results = await index.search(normalizedQuery, {
        limit: 20,
        enrich: true
    });

    // FlexSearch returns complicated structure. Flatten it to just IDs.
    const uniqueIds = new Set<string>();
    
    results.forEach((fieldResult: any) => {
        fieldResult.result.forEach((doc: any) => {
            uniqueIds.add(doc.id);
        });
    });

    return Array.from(uniqueIds);
};

export interface RAGContext {
    paper: Paper;
    textSnippet: string;
}

/**
 * Retrieves enriched context for RAG (AI Chat)
 * It searches the index, grabs metadata, and prepares snippets for the LLM.
 */
export const searchForRAG = async (query: string): Promise<RAGContext[]> => {
    try {
        const index = await initSearchIndex();
        const normalizedQuery = normalizePersian(query);
        
        // 1. Search (Limit to top 3 for context window efficiency)
        const results = await index.search(normalizedQuery, {
            limit: 3, 
            enrich: true,
            bool: "or"
        });

        // 2. Collect Unique IDs
        const ids = new Set<string>();
        const fullTexts = new Map<string, string>();
        
        results.forEach((field: any) => {
             field.result.forEach((doc: any) => {
                 ids.add(doc.id);
                 // Flexsearch with 'store: true' returns the content in doc.doc.content
                 if(doc.doc && doc.doc.content) {
                     fullTexts.set(doc.id, doc.doc.content);
                 }
             });
        });

        if (ids.size === 0) return [];

        // 3. Get Metadata
        const library = await getAllPapers();
        const context: RAGContext[] = [];

        for (const id of ids) {
            const paper = library.find(p => p.id === id);
            const text = fullTexts.get(id);
            
            if (paper && text) {
                // Heuristic: Provide the first 2500 characters of the paper
                // (Abstract + Introduction usually contains the core concepts)
                const snippet = text.substring(0, 2500) + "...";
                context.push({
                    paper,
                    textSnippet: snippet
                });
            }
        }

        return context;

    } catch (e) {
        console.error("RAG Search failed:", e);
        return [];
    }
};