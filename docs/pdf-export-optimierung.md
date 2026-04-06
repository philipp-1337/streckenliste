# PDF Export Optimierung: Natives PDF (Option B)

## Status
Noch nicht umgesetzt. Aktueller Stand: JPEG-Screenshot-Ansatz (`usePdfExport.ts`).

---

## Problem mit dem aktuellen Ansatz

Der aktuelle PDF-Export funktioniert wie ein "Screenshot":

1. `PrintContent` wird off-screen als HTML gerendert
2. `html-to-image` (`toJpeg`) fotografiert das Element als Rasterbild (JPEG, 2× Auflösung)
3. Das Bild wird in Seitenstreifen geschnitten
4. Die Streifen werden als JPEG-Bilder in eine jsPDF-Datei eingebettet

**Nachteile:**
- Datei ist unnötig groß (~1–2 MB nach JPEG-Optimierung, vorher ~12 MB)
- Text ist nicht durchsuchbar / nicht kopierbar im PDF
- Qualität hängt von Pixel-Dichte ab — bei kleinen Schriften können Artefakte entstehen
- Schriftgröße und Layout sind "eingefroren" — kein Reflow, kein Barrierefreiheits-Support
- Performance: Browser muss HTML rendern, Screenshot machen, Canvas-Operationen durchführen

---

## Option B: Natives PDF mit `jspdf-autotable`

### Grundidee

Statt das HTML zu fotografieren, wird das PDF **direkt programmatisch aufgebaut** — mit echtem Text, echten Linien und echten Zellen. Das Ergebnis ist ein Vektor-PDF.

### Technologie

- **[jsPDF](https://github.com/parallax/jsPDF)** — bereits im Projekt vorhanden
- **[jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)** — Plugin für jsPDF, das komplexe Tabellen mit Kopfzeilen, rowSpan, colSpan, Styling etc. unterstützt

```bash
npm install jspdf-autotable
```

### Vorteile

| Kriterium | Aktuell (JPEG) | Option B (Nativ) |
|---|---|---|
| Dateigröße | ~1–2 MB | ~50–150 KB |
| Text durchsuchbar | Nein | Ja |
| Text kopierbar | Nein | Ja |
| Qualität | Pixelbasiert | Vektoren (perfekt scharf) |
| Skalierbarkeit | Verliert Qualität | Beliebig skalierbar |
| Performance | Langsam (DOM-Render + Canvas) | Schnell (direkte PDF-Generierung) |
| Barrierefreiheit | Keine | Grundlegende Unterstützung |

### Herausforderung: Die komplexe Kopfzeilen-Struktur

Die größte technische Hürde ist die verschachtelte Tabellen-Kopfzeile in `PrintContent.tsx`. Sie hat **8 Zeilen** mit `rowSpan` und `colSpan`:

```
lfd. Nr. | Datum | Wildart | Schalenwild (colSpan=8)              | Gewicht | Bemerkung (colSpan=2)
                           | Jungwild (c=2) | weibl. (c=2) | männl. (c=4) |
                           | AK0 m | AK0 w | AK1 | AK2+ | AK1 | AK2 | AK3 | AK4 |
                           | (unter 1J) | ... | ... | ...  | ... | ... |     |     |
         Rotwild           | Kälber (c=2)  | Schmalti. | Alttiere | ...
         Damwild           | Kälber (c=2)  | Schmalti. | Alttiere | ...
         Rehwild           | Kitze (c=2)   | Schmalrehe | Ricken  | ...
         Schwarzwild       | Frischlinge(c=2) | Überl.bache | Bachen | ...
```

`jspdf-autotable` unterstützt verschachtelte Kopfzeilen über das `head`-Array mit `rowSpan` und `colSpan` in der Cell-Definition.

### Implementierungs-Skizze

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const generateNativePdf = (eintraege: Eintrag[], jagdjahr: string, jagdbezirk: string) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Titel
  pdf.setFontSize(8);
  pdf.text(`Anlage zur Streckenliste für das Jagdjahr: ${jagdjahr}`, 15, 12);
  pdf.text(`Jagdbezirk: ${jagdbezirk}`, 120, 12);

  // Verschachtelte Kopfzeilen
  const head = [
    [
      { content: 'lfd. Nr.', rowSpan: 8, styles: { valign: 'middle' } },
      { content: 'Datum', rowSpan: 8, styles: { valign: 'middle' } },
      { content: 'Wildart', rowSpan: 4, styles: { valign: 'middle' } },
      { content: 'Schalenwild', colSpan: 8, styles: { halign: 'center' } },
      { content: 'Gewicht (kg)', rowSpan: 8, styles: { valign: 'middle' } },
      { content: 'Bemerkung', colSpan: 2, rowSpan: 5, styles: { halign: 'center' } },
    ],
    [
      { content: 'Jungwild', colSpan: 2, styles: { halign: 'center' } },
      { content: 'weibliches Wild', colSpan: 2, styles: { halign: 'center' } },
      { content: 'männliches Wild', colSpan: 4, styles: { halign: 'center' } },
    ],
    // ... weitere Header-Zeilen
  ];

  // Datensätze
  const body = sortedEintraege.map((eintrag, i) => [
    i + 1,
    new Date(eintrag.datum).toLocaleDateString('de-DE'),
    eintrag.wildart,
    eintrag.altersklasse === 'AK 0' && eintrag.geschlecht === 'm' ? 'x' : '',
    // ... weitere Spalten
  ]);

  autoTable(pdf, {
    head,
    body,
    startY: 16,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    theme: 'grid',
  });

  return pdf;
};
```

### Geschätzter Aufwand

- **Kopfzeilen-Struktur übersetzen**: 3–4 Stunden — die 8 Zeilen mit rowSpan/colSpan müssen exakt in jspdf-autotable-Syntax abgebildet werden
- **Datenmapping**: 1 Stunde — Einträge den richtigen Spalten zuordnen (Wildart × Altersklasse × Geschlecht)
- **Styling angleichen**: 1–2 Stunden — Schriftgrößen, Rahmen, Hintergrundfarben abstimmen
- **Testing**: 1–2 Stunden — Seitenumbrüche, Randbehandlung, verschiedene Datenmenge

**Gesamt: ca. 6–9 Stunden**

### Empfohlene Vorgehensweise bei Umsetzung

1. `jspdf-autotable` installieren
2. Neue Funktion `generateNativePdf()` parallel zu `usePdfExport` entwickeln
3. Mit einem einfachen Test-Datensatz die Kopfzeilen-Struktur iterativ aufbauen und prüfen
4. Alten Screenshot-Ansatz erst entfernen wenn nativer Ansatz visuell gleichwertig ist
5. `html-to-image` aus den Dependencies entfernen (spart ~200 KB im Bundle)

### Referenzen

- jspdf-autotable Docs & Beispiele: https://github.com/simonbengtsson/jsPDF-AutoTable
- Komplexe Kopfzeilen mit rowSpan/colSpan: https://github.com/simonbengtsson/jsPDF-AutoTable#complex-headers
- jsPDF API Referenz: https://artskydj.github.io/jsPDF/docs/
