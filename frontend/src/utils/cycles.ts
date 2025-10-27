// utils/cycles.ts
export function buildQuarterCycles({ yearsBack = 1, yearsForward = 1 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const values: string[] = ['current']; // sentinel
  for (let y = Y - yearsBack; y <= Y + yearsForward; y++) {
    for (let q = 1; q <= 4; q++) values.push(`q${q}_${y}`); // machine values
  }
  return values;
}

export function displayCycleLabel(id: string) {
  if (id === 'current') return 'Current Quarter';
  // q4_2025 -> Q4 2025
  if (/^q[1-4]_\d{4}$/i.test(id)) {
    const [q, y] = id.split('_');
    return `${q.toUpperCase()} ${y}`;
  }
  return id; // fallback
}

// Convert UI value to server label for RPC: 'Q4 2025' or null
export function normalizeCycle(id?: string | null) {
  if (!id || id === 'current') return null;
  if (/^q[1-4]_\d{4}$/i.test(id)) {
    const [q, y] = id.split('_');
    return `${q.toUpperCase()} ${y}`;
  }
  if (/^Q[1-4]\s+\d{4}$/.test(id)) return id.toUpperCase();
  return null;
}

