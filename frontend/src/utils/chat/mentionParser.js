/**
 * Parse @channel mentions from text
 * @param {string} text - Text containing @mentions
 * @returns {string[]} - Array of channel names (without @)
 */
export function extractMentions(text) {
  if (!text) return [];

  const regex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Remove @mentions from text
 * @param {string} text - Text with @mentions
 * @returns {string} - Clean text
 */
export function removeMentions(text) {
  if (!text) return '';
  return text.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Highlight @mentions in text
 * @param {string} text - Text with @mentions
 * @returns {string} - HTML with highlighted mentions
 */
export function highlightMentions(text) {
  if (!text) return '';

  return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}
