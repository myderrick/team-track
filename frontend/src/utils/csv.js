// utils/csv.js — minimal client-side CSV export
function escapeCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Download an array of rows as a CSV file.
 * @param {string} filename
 * @param {Array<object>} rows
 * @param {Array<{key:string,label:string,format?:(value:any,row:object)=>any}>} columns
 */
export function downloadCsv(filename, rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = (rows || [])
    .map((r) => columns.map((c) => escapeCell(c.format ? c.format(r[c.key], r) : r[c.key])).join(','))
    .join('\n');
  const csv = `${header}\n${body}`;
  // BOM so Excel reads UTF-8 correctly
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
