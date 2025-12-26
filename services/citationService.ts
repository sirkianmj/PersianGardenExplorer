// Developed by Kian Mansouri Jamshidi
import { Paper } from '../types';

/**
 * Generates a BibTeX formatted string for a given paper.
 * Auto-detects if it should be @article or @misc based on metadata.
 */
export const generateBibTeX = (paper: Paper): string => {
  // Heuristic: If it has volume/issue or source looks like a journal, treat as article.
  // Otherwise generic misc.
  const isArticle = !!paper.volume || !!paper.issue || (paper.source && paper.source.includes('Journal')) || (paper.source && paper.source.includes('مجله'));
  const type = isArticle ? 'article' : 'misc';
  
  // Create a clean key: AuthorYear (e.g., Pirnia1390)
  let key = paper.citationKey;
  if (!key) {
      const authorLast = paper.authors.length > 0 ? paper.authors[0].split(' ').pop() : 'Unknown';
      // Remove non-alphanumeric chars from key for safety
      const cleanAuthor = authorLast?.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '') || 'Ref';
      const cleanYear = paper.year.replace(/[^0-9]/g, '');
      key = `${cleanAuthor}${cleanYear}`;
  }

  const authorStr = paper.authors.join(' and ');

  let bib = `@${type}{${key},\n`;
  bib += `  title = {${paper.title}},\n`;
  bib += `  author = {${authorStr}},\n`;
  bib += `  year = {${paper.year}},\n`;
  
  if (paper.source) {
      if (type === 'article') {
          bib += `  journal = {${paper.source}},\n`;
      } else {
          bib += `  howpublished = {${paper.source}},\n`;
      }
  }
  
  if (paper.publisher) bib += `  publisher = {${paper.publisher}},\n`;
  if (paper.volume) bib += `  volume = {${paper.volume}},\n`;
  if (paper.issue) bib += `  number = {${paper.issue}},\n`;
  if (paper.url) bib += `  url = {${paper.url}},\n`;
  if (paper.abstract) {
      // Truncate abstract to keep bibtex light
      const cleanAbs = paper.abstract.replace(/\n/g, ' ').substring(0, 300);
      bib += `  abstract = {${cleanAbs}...},\n`;
  }
  
  bib += `}`;
  
  return bib;
};

/**
 * Triggers a download of the .bib file
 */
export const downloadBibTex = (paper: Paper) => {
    const bib = generateBibTeX(paper);
    const blob = new Blob([bib], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename
    let filename = paper.citationKey || 'citation';
    filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.bib`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};