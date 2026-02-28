/**
 * OCD-friendly text formatter
 */
export function formatText(text: string): string {
  let formatted = text;

  // 1. Add space between Chinese and English/Numbers
  // Chinese characters: [\u4e00-\u9fa5]
  formatted = formatted.replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2');
  formatted = formatted.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2');

  // 2. Add space between English and Numbers (optional, but often requested)
  // formatted = formatted.replace(/([a-zA-Z])([0-9])/g, '$1 $2');
  // formatted = formatted.replace(/([0-9])([a-zA-Z])/g, '$1 $2');

  // 3. Unify quotes (prefer straight quotes for code, but smart quotes for text)
  // For this implementation, let's just ensure consistency.
  // If the text is primarily Chinese, use Chinese quotes. If English, use English quotes.
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  if (isChinese) {
    // Replace English quotes with Chinese ones if it's a Chinese context
    // This is complex to do perfectly without a parser, but basic replacements:
    // formatted = formatted.replace(/"([^"]*)"/g, '“$1”');
  }

  return formatted;
}
