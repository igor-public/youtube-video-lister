/**
 * Highlights search query matches in text with light green background
 * @param {string} text - The text to search and highlight
 * @param {string} searchQuery - The search query
 * @returns {Array} Array of text and highlighted JSX elements
 */
export function highlightText(text, searchQuery) {
  if (!searchQuery || !searchQuery.trim() || !text) {
    return text;
  }

  const query = searchQuery.trim();
  const parts = [];
  let lastIndex = 0;

  // Create regex for case-insensitive search
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

  text.split(regex).forEach((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      // This is a match - highlight it
      parts.push(
        <span
          key={index}
          style={{
            backgroundColor: 'rgba(144, 238, 144, 0.4)',
            padding: '1px 2px',
            borderRadius: '2px'
          }}
        >
          {part}
        </span>
      );
    } else if (part) {
      // Regular text
      parts.push(part);
    }
  });

  return parts.length > 0 ? parts : text;
}
