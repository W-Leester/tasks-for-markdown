const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Random 6-char lowercase alphanumeric id (Obsidian Tasks style); `taken` avoids collisions. */
export function generateTaskId(taken: (id: string) => boolean = () => false, length = 6): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let id = '';
    for (let i = 0; i < length; i++) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!taken(id)) return id;
  }
  return `${Date.now().toString(36)}`;
}
