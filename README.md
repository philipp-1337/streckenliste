# 🦌 Streckenliste

> A modern digital hunting bag management system with multi-user support, hunting district administration, and real-time synchronization. Built with React, TypeScript, Firebase, and PWA capabilities.

Eine moderne, digitale Streckenliste für die Jagd mit Multi-User-Unterstützung, Jagdbezirksverwaltung und Echtzeit-Synchronisation.

## 📋 Übersicht

Streckenliste ist eine Progressive Web App (PWA) zur Verwaltung von Jagdabschüssen. Die Anwendung ermöglicht es Jägern und Jagdpächtern, ihre Strecke digital zu erfassen, zu verwalten und auszuwerten.

### Hauptfunktionen

- 📝 **Digitale Erfassung** von Abschüssen mit allen relevanten Daten
- 🔄 **Echtzeit-Synchronisation** über Firebase Firestore
- 👥 **Multi-User-Verwaltung** mit Rollen (Admin/Benutzer)
- 🏞️ **Jagdbezirke** - Organisierte Datenverwaltung nach Revieren
- 📊 **Statistiken & Auswertungen** mit visuellen Darstellungen
- 📤 **CSV-Export** für Excel-Weiterverarbeitung
- 📥 **CSV-Import** aus bestehenden Excel-Listen
- 🖨️ **Druckansicht** für offizielle Dokumentation
- 📱 **Offline-Funktionalität** als installierbare PWA
- 🎯 **Fachjagdliche Begriffe** automatisch zugeordnet

## 🚀 Technologie-Stack

- **Frontend**: React 19 mit TypeScript
- **Build-Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Notifications**: Sonner
- **PWA**: vite-plugin-pwa

## 📦 Installation

### Voraussetzungen

- Node.js (Version 18 oder höher)
- npm oder yarn
- Firebase-Projekt mit Firestore und Authentication

### Entwicklungsumgebung einrichten

```bash
# Repository klonen
git clone <repository-url>
cd streckenliste

# Dependencies installieren
npm install

# Firebase-Konfiguration erstellen
# Erstelle eine Datei src/firebase.ts mit deiner Firebase-Config

# Entwicklungsserver starten
npm run dev
```

### Firebase-Konfiguration

Erstelle eine Firebase-Konfigurationsdatei in `src/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Firestore-Sicherheitsregeln einrichten

Deploye die Firestore-Regeln aus `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

## 🛠️ Verfügbare Scripts

```bash
# Entwicklungsserver mit Hot Module Replacement
npm run dev

# Production Build erstellen
npm run build

# Production Build lokal testen
npm run preview

# Linting
npm run lint
```

## 🎯 Features im Detail

### Wildarten-Verwaltung

Unterstützte Wildarten:

- **Schalenwild**: Schwarzwild, Rehwild, Rotwild, Damwild
- **Raubwild**: Waschbär, Fuchs, Dachs
- Automatische Zuordnung von Altersklassen, Geschlecht und Fachbegriffen

### Datenerfassung

Pro Eintrag werden erfasst:

- Datum des Abschusses
- Wildart und Kategorie
- Altersklasse und Geschlecht
- Fachjagdlicher Begriff
- Gewicht
- Jägername
- Ort des Abschusses
- Einnahmen (z.B. Wildpretverwertung)
- Bemerkungen und Notizen

### Filter & Statistiken

- Filterung nach Wildart, Jäger, Jahr und Kategorie
- Gesamtanzahl und Summen pro Wildart
- Gewichtsstatistiken
- Einnahmenübersicht
- Verteilung nach Altersklassen

### CSV-Import/Export

**Export:**

- Vollständiger Datenexport als CSV
- Excel-kompatibles Format
- Alle Felder inklusive

**Import:**

- Import aus Excel-CSV-Dateien
- Automatische Datumserkennung
- Intelligente Zuordnung von Wildarten und Altersklassen
- Detaillierte Anleitung in [CSV_IMPORT_ANLEITUNG.md](CSV_IMPORT_ANLEITUNG.md)

### PWA-Funktionalität

- Installierbar auf Desktop und Mobil
- Offline-Cache für statische Assets
- Automatische Update-Benachrichtigungen
- Service Worker für schnelle Ladezeiten

## 🏗️ Projektstruktur

```bash
src/
├── auth/              # Authentifizierungs-Komponenten
├── components/        # UI-Komponenten
├── constants/         # App-weite Konstanten
├── data/             # Wildarten-Definitionen
├── hooks/            # Custom React Hooks
├── types/            # TypeScript-Definitionen
└── utils/            # Hilfsfunktionen
```

## 🔐 Authentifizierung & Berechtigungen

- Firebase Authentication (Email/Passwort)
- Rollensystem: Admin und Benutzer
- Jagdbezirks-basierte Datentrennung
- Firestore-Sicherheitsregeln für Datenschutz

## 🚢 Deployment

### Firebase Hosting

```bash
# Build erstellen
npm run build

# Zu Firebase deployen
firebase deploy --only hosting
```

### Andere Hosting-Anbieter

Die App kann auf jedem statischen Hosting-Service deployed werden:

```bash
npm run build
# Inhalt des dist/-Ordners hochladen
```

## 📱 Browser-Unterstützung

- Chrome/Edge (aktuell)
- Firefox (aktuell)
- Safari (aktuell)
- Mobile Browser (iOS Safari, Chrome Android)

## 🤝 Beitragen

Contributions sind willkommen! Bitte beachte:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist privat und nicht für die öffentliche Nutzung lizenziert.

## 👨‍💻 Entwickler

Entwickelt mit ❤️ für die moderne Jagdverwaltung

---

**Version:** 0.0.1  
**Letzte Aktualisierung:** Januar 2026
