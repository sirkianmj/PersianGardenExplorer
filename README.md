# Pardis Scholar | کاوشگر باغ ایرانی

**A Specialized Academic Research Engine & Digital Archive for Persian Garden Studies**

![Version](https://img.shields.io/badge/version-1.0.0-tile_blue)
![License](https://img.shields.io/badge/license-MIT-garden_dark)
![Status](https://img.shields.io/badge/status-Academic_Production-clay_accent)

## 🏛️ Project Overview

**Pardis Scholar** is a high-performance, domain-specific research application designed to facilitate the discovery, analysis, and preservation of academic texts related to Persian Gardens (*Bāgh-e Irāni*), historical architecture, and landscape history.

Unlike general-purpose search engines, this system provides a curated environment for graduate researchers, historians, and architects, integrating real-time aggregation of Persian and International academic repositories with a powerful local digital library system.

## ✨ Key Features

### 🔍 Specialized Search Engine
*   **Multi-Source Aggregation:** Simultaneously queries domestic repositories (**SID, NoorMags, Ganjoor, IranArchpedia**) and international databases (**Semantic Scholar, CrossRef**).
*   **Smart Filtering:** Domain-specific filters for **Historical Periods** (e.g., Safavid, Timurid, Qajar) and **Research Topics** (e.g., Qanats, Geometry, Symbolism).
*   **Intelligent Query Handling:** Auto-detects language (Persian/English) and optimizes search terms for academic relevance.
*   **CORS Management:** Built-in proxy routing to bypass region-locked content restrictions on academic servers.

### 📚 Digital Library & Archive
*   **Local Persistence:** Stores metadata and full PDF documents locally using **IndexedDB** and **LocalStorage**, allowing for offline access.
*   **Professional Organization:** Supports Grid and List views with status badges (PDF available vs. Metadata only).
*   **Advanced Local Search:** Real-time filtering of the personal library by title, author, year, abstract, and tags.
*   **Citation Management:** Automated BibTeX key generation and citation tracking.

### 📖 Integrated Research Environment
*   **High-Fidelity PDF Reader:** Custom implementation (via `pdfjs-dist`) supporting High DPI rendering and reliable Persian text display.
*   **Annotation System:** Page-specific note-taking with timestamps and quick navigation.
*   **Visual Aesthetics:** A custom UI design language inspired by Iranian art, featuring Girih patterns, Nastaliq typography, and a "Garden Dark" color palette designed for long reading sessions.

## 🛠️ Technical Architecture

*   **Frontend Framework:** React 19 (TypeScript)
*   **Styling:** Tailwind CSS with custom academic theme configuration.
*   **Storage:** IndexedDB (for large PDF blobs) & LocalStorage (for relational metadata).
*   **PDF Engine:** PDF.js (Mozilla) with custom canvas rendering.
*   **Font Stack:** Vazirmatn (UI), Noto Nastaliq Urdu (Headers), Crimson Pro (Latin Serif).

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/pardis-scholar.git
    cd pardis-scholar
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm start
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## 👨‍💻 Credits & Development

This software was conceptualized and developed as part of a specialized academic project.

*   **Lead Developer:** Kian Mansouri Jamshidi
*   **Academic Supervisor:** Dr. Jayhani
*   **Course Context:** Persian Garden Studies (باغ ایرانی)
*   **Institution:** Shahid Beheshti University
*   **Year:** 1404 (2025-2026)

---

> *"Chū bāghī ke har gūshe-ash golshan ast"*  
> (Like a garden where every corner is a flowerbed)

© 2025 Pardis Scholar. All Rights Reserved.
