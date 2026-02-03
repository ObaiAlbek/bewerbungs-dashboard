export type ColumnKey = "ENTWURFE" | "GESENDET" | "INTERVIEW" | "ANGEBOT" | "ABSAGE";

export const COLUMNS: { key: ColumnKey; title: string }[] = [
  { key: "ENTWURFE", title: "ENTWÜRFE" },
  { key: "GESENDET", title: "GESENDET" },
  { key: "INTERVIEW", title: "INTERVIEW" },
  { key: "ANGEBOT", title: "ANGEBOT" },
  { key: "ABSAGE", title: "ABSAGE" },
];

export type Platform = "StepStone" | "Indeed" | "LinkedIn" | "Unternehmensseite" | "Sonstiges";

export type Item = {
  id: string;

  name: string;        // von dir
  link: string;        // von dir
  platform: Platform;  // von dir

  dateISO: string;     // automatisch (YYYY-MM-DD)
  column: ColumnKey;   // aktuelle Spalte
  order: number;       // Reihenfolge in der Spalte

  fileName: string;
  fileType: string;
  fileBlob: Blob;      // PDF wird in IndexedDB gespeichert

  createdAt: string;
  updatedAt: string;
};
