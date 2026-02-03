import React, { useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { ColumnKey, Item, Platform } from "./types";
import { COLUMNS } from "./types";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PLATFORMS: Platform[] = [
  "StepStone",
  "Indeed",
  "LinkedIn",
  "Unternehmensseite",
  "Sonstiges",
];

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function nowISO() {
  return new Date().toISOString();
}

function openBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function containsCI(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function Column({
  colKey,
  title,
  count,
  children,
}: {
  colKey: ColumnKey;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey });

  return (
    <div ref={setNodeRef} className={`column ${isOver ? "over" : ""}`}>
      <div className="columnHead">
        <strong>{title}</strong>
        <span className="badge">{count}</span>
      </div>
      {children}
    </div>
  );
}

function Card({
  item,
  onDelete,
  onEdit,
}: {
  item: Item;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { column: item.column },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? "dragging" : ""}`}
    >
      <div className="cardTop">
        <div style={{ minWidth: 0 }}>
          <div className="cardName">{item.name}</div>
          <div className="small">📅 {item.dateISO}</div>

          <div className="row">
            <span className="pill">{item.platform}</span>

            {item.link ? (
              <a
                className="pill"
                href={item.link}
                target="_blank"
                rel="noreferrer"
                title="Link öffnen"
              >
                Link öffnen ↗
              </a>
            ) : (
              <span className="pill">kein Link</span>
            )}

            <span className="pill">{item.fileName}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="iconBtn"
            title="Bearbeiten"
            onClick={() => onEdit(item.id)}
          >
            ✏️
          </button>

          <button
            className="iconBtn"
            title="PDF öffnen"
            onClick={() => openBlob(item.fileBlob, item.fileName)}
          >
            📄
          </button>

          <button
            className="iconBtn"
            title="Löschen"
            onClick={() => onDelete(item.id)}
          >
            🗑
          </button>

          <button
            className="iconBtn"
            title="Ziehen"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <strong>{title}</strong>
          <button className="iconBtn" onClick={onClose} title="Schließen">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UploadModal({
  open,
  file,
  onClose,
  onCreate,
}: {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onCreate: (data: { name: string; link: string; platform: Platform }) => void;
}) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState<Platform>("LinkedIn");

  React.useEffect(() => {
    if (open) {
      setName("");
      setLink("");
      setPlatform("LinkedIn");
    }
  }, [open]);

  return (
    <ModalShell open={open} title="Upload → Karte erstellen" onClose={onClose}>
      <div className="modalBody">
        <div className="small" style={{ marginBottom: 10 }}>
          Datei: <b>{file?.name ?? "—"}</b> (kommt automatisch in{" "}
          <b>GESENDET</b>)
        </div>

        <div className="grid">
          <div className="field">
            <label>Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Werkstudent Frontend (Firma)"
            />
          </div>

          <div className="field">
            <label>Plattform</label>
            <select
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Link</label>
            <input
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="modalFoot">
        <button className="btn" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn"
          onClick={() => {
            if (!name.trim()) {
              alert("Bitte Name ausfüllen.");
              return;
            }
            onCreate({ name: name.trim(), link: link.trim(), platform });
          }}
        >
          Erstellen
        </button>
      </div>
    </ModalShell>
  );
}

function EditModal({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (data: {
    id: string;
    name: string;
    link: string;
    platform: Platform;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState<Platform>("LinkedIn");

  React.useEffect(() => {
    if (open && item) {
      setName(item.name);
      setLink(item.link);
      setPlatform(item.platform);
    }
  }, [open, item]);

  return (
    <ModalShell open={open} title="Karte bearbeiten" onClose={onClose}>
      <div className="modalBody">
        <div className="small" style={{ marginBottom: 10 }}>
          PDF bleibt gleich. Du änderst nur <b>Name</b>, <b>Link</b>,{" "}
          <b>Plattform</b>.
        </div>

        <div className="grid">
          <div className="field">
            <label>Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Plattform</label>
            <select
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Link</label>
            <input
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="modalFoot">
        <button className="btn" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn"
          onClick={() => {
            if (!item) return;
            if (!name.trim()) {
              alert("Bitte Name ausfüllen.");
              return;
            }
            onSave({
              id: item.id,
              name: name.trim(),
              link: link.trim(),
              platform,
            });
          }}
        >
          Speichern
        </button>
      </div>
    </ModalShell>
  );
}

export default function App() {
  const itemsAll = useLiveQuery(() => db.items.toArray(), []) ?? [];

  // 🔍 Suche/Filter
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "ALLE">(
    "ALLE",
  );

  const items = useMemo(() => {
    const qq = q.trim();
    return itemsAll.filter((it) => {
      if (platformFilter !== "ALLE" && it.platform !== platformFilter)
        return false;
      if (!qq) return true;
      return containsCI(it.name, qq) || containsCI(it.link, qq);
    });
  }, [itemsAll, q, platformFilter]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const editingItem = useMemo(
    () => itemsAll.find((x) => x.id === editId) ?? null,
    [itemsAll, editId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map = new Map<ColumnKey, Item[]>();
    for (const c of COLUMNS) map.set(c.key, []);
    for (const it of items) map.get(it.column)!.push(it);

    // Wichtig: SortableContext erwartet die items in Render-Reihenfolge
    for (const c of COLUMNS) {
      map.set(
        c.key,
        map
          .get(c.key)!
          .slice()
          .sort((a, b) => a.order - b.order),
      );
    }
    return map;
  }, [items]);

  async function createCard(meta: {
    name: string;
    link: string;
    platform: Platform;
  }) {
    if (!pickedFile) return;

    const column: ColumnKey = "GESENDET";
    const countInColumn = await db.items.where({ column }).count();

    const now = nowISO();
    const item: Item = {
      id: nanoid(),
      name: meta.name,
      link: meta.link,
      platform: meta.platform,

      dateISO: todayISO(),
      column,
      order: countInColumn,

      fileName: pickedFile.name,
      fileType: pickedFile.type || "application/pdf",
      fileBlob: pickedFile,

      createdAt: now,
      updatedAt: now,
    };

    await db.items.add(item);

    setUploadOpen(false);
    setPickedFile(null);
  }

  async function onDelete(id: string) {
    if (!confirm("Diese Karte wirklich löschen?")) return;
    await db.items.delete(id);
  }

  async function onEdit(id: string) {
    setEditId(id);
    setEditOpen(true);
  }

  async function onSaveEdit(data: {
    id: string;
    name: string;
    link: string;
    platform: Platform;
  }) {
    await db.items.update(data.id, {
      name: data.name,
      link: data.link,
      platform: data.platform,
      updatedAt: nowISO(),
    });
    setEditOpen(false);
    setEditId(null);
  }

  // 📌 UX: Renumber nur dann, wenn nötig
  async function renumberIfNeeded(column: ColumnKey) {
    const list = await db.items.where({ column }).sortBy("order");
    let changed = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].order !== i) {
        changed = true;
        break;
      }
    }
    if (!changed) return;

    for (let i = 0; i < list.length; i++) {
      await db.items.update(list[i].id, { order: i, updatedAt: nowISO() });
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const all = await db.items.toArray();
    const activeItem = all.find((x) => x.id === activeId);
    if (!activeItem) return;

    const overItem = all.find((x) => x.id === overId);
    const isOverColumn = COLUMNS.some((c) => c.key === (overId as ColumnKey));

    const targetColumn: ColumnKey = overItem
      ? overItem.column
      : isOverColumn
        ? (overId as ColumnKey)
        : activeItem.column;

    const sourceColumn = activeItem.column;

    // 1) Reorder innerhalb derselben Spalte
    if (sourceColumn === targetColumn) {
      const list = (
        await db.items.where({ column: sourceColumn }).sortBy("order")
      ).map((x) => x.id);

      const from = list.indexOf(activeId);
      if (from === -1) return;

      // Wenn du auf Spalte dropst: ans Ende
      const to = overItem ? list.indexOf(overItem.id) : list.length - 1;
      if (to < 0 || from === to) return;

      const moved = arrayMove(list, from, to);
      for (let i = 0; i < moved.length; i++) {
        await db.items.update(moved[i], { order: i, updatedAt: nowISO() });
      }
      return;
    }

    // 2) Move zwischen Spalten
    await db.transaction("rw", db.items, async () => {
      const sourceList = (
        await db.items.where({ column: sourceColumn }).sortBy("order")
      )
        .map((x) => x.id)
        .filter((id) => id !== activeId);

      const targetList = (
        await db.items.where({ column: targetColumn }).sortBy("order")
      ).map((x) => x.id);

      const insertIndex = overItem
        ? targetList.indexOf(overItem.id)
        : targetList.length;
      const newTarget = [
        ...targetList.slice(0, insertIndex),
        activeId,
        ...targetList.slice(insertIndex),
      ];

      await db.items.update(activeId, {
        column: targetColumn,
        updatedAt: nowISO(),
      });

      for (let i = 0; i < sourceList.length; i++) {
        await db.items.update(sourceList[i], { order: i, updatedAt: nowISO() });
      }
      for (let i = 0; i < newTarget.length; i++) {
        await db.items.update(newTarget[i], { order: i, updatedAt: nowISO() });
      }
    });

    await renumberIfNeeded(sourceColumn);
    await renumberIfNeeded(targetColumn);
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="title">
          <h1>Bewerbungs-Board (simpel)</h1>
          <div className="sub">
            Upload → Karte in „Gesendet“ → Drag & Drop → alles bleibt
            gespeichert.
          </div>
          <div className="hint">
            Tipp: Suche kann auch Link-Text finden. Filter zeigt nur passende
            Karten.
          </div>
        </div>

        <div className="controls">
          <input
            className="searchInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Suche nach Name oder Link…"
          />

          <select
            className="selectSmall"
            value={platformFilter}
            onChange={(e) =>
              setPlatformFilter(e.target.value as Platform | "ALLE")
            }
            title="Plattform filtern"
          >
            <option value="ALLE">Plattform: Alle</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button className="btn" onClick={() => inputRef.current?.click()}>
            + PDF hochladen
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              ev.currentTarget.value = "";
              if (!f) return;
              setPickedFile(f);
              setUploadOpen(true);
            }}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {COLUMNS.map((col) => {
            const list = grouped.get(col.key) ?? [];
            return (
              <Column
                key={col.key}
                colKey={col.key}
                title={col.title}
                count={list.length}
              >
                <SortableContext
                  items={list.map((x) => x.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {list.map((it) => (
                    <Card
                      key={it.id}
                      item={it}
                      onDelete={onDelete}
                      onEdit={onEdit}
                    />
                  ))}
                </SortableContext>

                {list.length === 0 ? <div className="empty">LEER</div> : null}
              </Column>
            );
          })}
        </div>
      </DndContext>

      <UploadModal
        open={uploadOpen}
        file={pickedFile}
        onClose={() => {
          setUploadOpen(false);
          setPickedFile(null);
        }}
        onCreate={createCard}
      />

      <EditModal
        open={editOpen}
        item={editingItem}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        onSave={onSaveEdit}
      />
    </div>
  );
}
