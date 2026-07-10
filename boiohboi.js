const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, LevelFormat, convertInchesToTwip,
  PageBreak, TableOfContents
} = require("docx");

const NAVY = "1F2937";
const ACCENT = "7C3AED";
const LIGHTGREY = "F3F4F6";
const RED = "B91C1C";
const GREEN = "15803D";

function H1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
}
function H2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}
function H3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
}
function P(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 150 },
  });
}
function Bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}
function Bullet2(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    bullet: { level: 1 },
    spacing: { after: 80 },
  });
}
function Note(text) {
  return new Paragraph({
    children: [new TextRun({ text: "⚠ " + text, italics: true, color: RED })],
    spacing: { after: 150, before: 100 },
    shading: { type: ShadingType.CLEAR, fill: "FEF2F2" },
  });
}
function Quote(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: "374151" })],
    indent: { left: convertInchesToTwip(0.4) },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } },
    spacing: { after: 200, before: 100 },
  });
}

function simpleTable(headers, rows, widths) {
  const totalWidth = 9000;
  const w = widths || headers.map(() => Math.floor(totalWidth / headers.length));
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: NAVY },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })],
    })),
  });
  const dataRows = rows.map((r, idx) => new TableRow({
    children: r.map((cellText, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? "FFFFFF" : LIGHTGREY },
      children: [new Paragraph({ children: [new TextRun({ text: String(cellText) })] })],
    })),
  }));
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: w,
    rows: [headerRow, ...dataRows],
  });
}

const children = [];

// TITLE PAGE
children.push(
  new Paragraph({
    children: [new TextRun({ text: "OUTALIVE", bold: true, size: 64, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Game Design Dokument — Vollständige Fassung", size: 28, color: ACCENT, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Konzept, Systeme, Onboarding & offene Fragen", size: 22, color: "6B7280" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 2000 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Version: Design-Diskussion (kompiliert)", size: 20, color: "6B7280" })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(
  H1("Inhaltsverzeichnis"),
  new TableOfContents("Inhaltsverzeichnis", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. STORYLINE
children.push(H1("1. Storyline"));
children.push(Quote("Du wachst in einem fremden Bett auf. Kein Licht, kein Geräusch, nur der modrige Geruch von altem Holz und feuchtem Putz. Draußen: Wald, so weit das Auge reicht, und irgendwo am Horizont die Umrisse verlassener Mehrfamilienhäuser, die längst niemand mehr bewohnt."));
children.push(P("Auf dem Nachttisch liegt ein Zettel. Keine Unterschrift, nur eine Warnung: Sie kommen. Verteidige dich, solange du kannst. Zwei alte Telefone im Erdgeschoss sind die einzige Verbindung nach draußen — über sie lassen sich vereinzelt Lieferungen bestellen, bezahlt mit Schrott, den du im Haus und im Garten findest."));
children.push(P("Ein alter Fernseher im Wohnzimmer verspricht mehr, doch er ist gesperrt. Der Code dazu liegt irgendwo draußen versteckt, an einem von zehn möglichen Orten, jede Runde neu."));
children.push(P("Die Villa ist nicht leer. Etwas bewegt sich in den Schatten zwischen Keller und Dachboden, wartet im Pool hinter dem Haus, lauert im Holzschuppen am Waldrand. Du musst überleben — nicht für immer, nur lange genug."));
children.push(P("Irgendwann, wenn fast alles zur Ruhe gekommen ist, klingelt eines der alten Telefone. Eine Stimme, die du nicht kennst, gibt dir eine einzige Anweisung: Begib dich zur Straßensperre. In diesem Moment erwacht alles wieder, was du zum Schweigen gebracht hast. Der letzte Weg zur Polizeistation ist der gefährlichste — eine lange, dunkle Straße, gesäumt von Ausweichrouten und Hindernissen, verfolgt von allem, was in der Villa überlebt hat."));
children.push(P("Manche schaffen es zur Straßensperre und zur rettenden Polizeistation. Die meisten nicht.", { bold: true }));

// 2. DESIGN-DIAGNOSE
children.push(H1("2. Design-Diagnose: Warum sich das Konzept \"zu simpel\" anfühlt"));
children.push(P("Ausgangsfrage: Das Grundkonzept wirkt stimmig, aber es besteht die Sorge, dass es floppen könnte, weil es \"zu simpel\" ist."));
children.push(H2("2.1 Was bereits funktioniert"));
children.push(Bullet("Starke Atmosphäre und Prämisse (stilles Erwachen, anonyme Warnung, zwei Telefone als einzige Außenverbindung)."));
children.push(Bullet("Zwei-Phasen-Struktur (Villa-Survival → finaler Chase) — die meisten asymmetrischen Horror-Titel (Dead by Daylight, Propnight, Deceit, Forsaken) haben nur eine sich wiederholende Phase. Ein zweiter Akt mit echtem Spannungsbogen ist strukturell ein Alleinstellungsmerkmal."));
children.push(Bullet("Schrott-Ökonomie mit Risiko/Belohnung (draußen wertvoller, aber gefährlicher)."));
children.push(Bullet("Modifier-System als Meta-Progression."));
children.push(H2("2.2 Woher das \"Simpel\"-Gefühl tatsächlich kommt"));
children.push(Bullet("Nur eine Monster-Rolle mit festem Stat-Block → \"Monster spielen\" fühlt sich nach wenigen Runden für jeden Spieler gleich an, unabhängig von Skill oder Vorliebe."));
children.push(Bullet("Trap-System war ursprünglich ein reiner Power-Trade-off (mehr Schaden/weniger Uses vs. weniger Schaden/länger Stun) — führt langfristig zu einer mathematisch \"richtigen\" Wahl statt echter taktischer Entscheidung."));
children.push(Bullet("Der Code-Hunt (10 Orte) ist strukturell ein generischer Item-Hunt, kein Alleinstellungsmerkmal für sich genommen."));
children.push(P("Kernaussage: Das Konzept floppt nicht, weil es zu simpel ist — sondern nur, wenn es simpel bleibt, wo Tiefe hinsollte (Monster-Varianz, Trap-Entscheidungen, Chase-Mechanik). Die Fundamente sind gut genug, dass sich Ausbauen lohnt.", { bold: true }));

// 3. ROLLEN
children.push(H1("3. Rollen"));
children.push(H2("3.1 Grund-Stat-Block (Basisversion)"));
children.push(simpleTable(
  ["RUNNER", "MONSTER"],
  [
    ["+ Kann Fallen bestellen", "+ Kann sich im Hellen & Dunklen aufhalten"],
    ["+ Kann crouchen & sich verstecken", "+ Immun gegen alle Traps"],
    ["", "+ Schneller"],
    ["", "+ Kann attackieren"],
    ["", "+ Mehr Health"],
    ["− Muss Stromausfälle beheben", "− Nimmt Schaden im Licht"],
    ["− Langsamer", "− Nimmt Schaden von Traps"],
    ["− Schlechtere Sicht", "− Laut & groß"],
    ["", "− Muss sich verstecken (z. B. vor Licht-Zonen wie dem Keller)"],
  ],
  [4500, 4500]
));
children.push(H2("3.2 Rollenauswahl statt Zufallszuweisung"));
children.push(P("Spieler sollen ihre Rolle bzw. ihren Archetyp aktiv wählen können, statt zufällig zugewiesen zu werden — sobald es mehrere Monster-Archetypen gibt, ist das praktisch Pflicht, sonst frustriert eine unpassende Zwangszuweisung."));
children.push(H2("3.3 Unlock-System: Freischaltbare Archetypen"));
children.push(P("Idee: \"Goated\" Rollen werden über Wins/Progress freigeschaltet, während ein Basis-Roster von Anfang an frei verfügbar ist."));
children.push(H3("Designprinzipien für Unlocks"));
children.push(Bullet("Freigeschaltete Archetypen sollten ANDERS sein, nicht STÄRKER. Sobald ein Unlock objektiv besser ist als der Starter, entsteht ein Grind-to-Win-Problem, das neue Spieler doppelt bestraft (weniger Erfahrung + schlechtere Tools)."));
children.push(Bullet("Unlock-Bedingung besser über kumulative Rollenerfahrung / Achievements als über reine Win-Zahl, da Winrates zwischen Runner- und Monster-Seite unterschiedlich sein können und sonst Content ungleich schnell freigeschaltet wird."));
children.push(Bullet("Das Start-Roster (2–3 Archetypen frei) muss von Anfang an unterschiedliche, valide Playstyles abdecken (z. B. Stealth / Aggro / Utility), damit der Einstieg nicht arm wirkt."));
children.push(H3("Vorschlag Struktur"));
children.push(Bullet("Start: 2–3 Basis-Archetypen frei, z. B. Schleicher (unsichtbar/lautlos, wenig Health, langsamer Angriff), Brecher (kann Barrikaden zerstören, aber laut), Jäger (schneller, besser tracken, verwundbarer im Licht)."));
children.push(Bullet("Unlock: 1–2 weitere Archetypen pro Rolle, freigeschaltet über kumulative Rollenerfahrung statt reinem Win-Count."));
children.push(Bullet("Freigeschaltete Archetypen als Hybrid-/Nischen-Builds designen (z. B. stark im Team-Zusammenspiel, aber solo schwach), während Starter breit einsetzbar bleiben."));
children.push(Note("Offen: Konkrete Werte/Fähigkeiten für 4–5 Archetypen (Starter + Unlockable) sind noch nicht final ausgearbeitet. Ebenso die genaue Unlock-Kurve (wie viele Runden/Achievements pro Archetyp)."));

// 4. GRUNDABLAUF
children.push(H1("4. Grundlegender Spielablauf"));
children.push(Bullet("Der Spieler wacht in der Villa auf."));
children.push(Bullet("Über die alten Telefone lassen sich mit Schrott einfache Fallen bestellen."));
children.push(Bullet("Die Monster versuchen, den Runner zu eliminieren."));
children.push(Bullet("Der Runner versucht, alle Monster bis auf eines auszuschalten."));
children.push(Bullet("Sobald nur noch ein Monster übrig ist, klingelt ein zufälliges Telefon — eine anonyme Stimme schickt den Runner zur Straßensperre."));
children.push(Bullet("Alle Monster werden wiederbelebt. Der finale Chase entlang der Straße beginnt."));
children.push(Bullet("Erreicht der Runner die Polizeistation, gewinnt er. Erreicht er sie nicht, gewinnen die Monster."));

children.push(H2("4.1 Fortschritt innerhalb einer Runde: TV & Code"));
children.push(Bullet("Der TV lässt sich freischalten und bietet bessere Fallen sowie höhere Bestelllimits."));
children.push(Bullet("Dafür wird ein 4-stelliger Code benötigt, zufällig generiert zu Rundenbeginn."));
children.push(Bullet("Der Code liegt an einem von 10 möglichen Orten außerhalb der Villa."));
children.push(Note("Design-Entscheidung: Der TV/Code-Hunt muss nicht im ersten Onboarding-Anruf erklärt werden — er darf bewusst als spät entdeckbares System behandelt werden (siehe Kapitel 9, Onboarding)."));

// 5. WÄHRUNG / LOOT SYSTEM
children.push(H1("5. Währung: Schrott & Loot-Spot-System"));
children.push(H2("5.1 Grundprinzip"));
children.push(Bullet("Fallen werden nicht über feste Slots, sondern über gefundenen Schrott finanziert."));
children.push(Bullet("Schrott liegt verstreut im Haus und im Garten — draußen häufiger und wertvoller als drinnen, was Risiko und Belohnung koppelt."));
children.push(Bullet("Bestellungen bleiben an den Telefonen und am TV mengenmäßig begrenzt, ihre Qualität hängt vom eingesetzten Schrott ab."));

children.push(H2("5.2 Technische Spezifikation: Loot-Spot-System"));
children.push(P("Gesamtzahl der Spots: 29 feste Orte, verteilt auf Haus (Innenbereich) und Garten/Außenbereich."));
children.push(H3("Spot-Zustände (Roll-Gewichtung)"));
children.push(simpleTable(
  ["Zustand", "Wahrscheinlichkeit"],
  [
    ["Schrott", "60 %"],
    ["Adrenalin", "5 %"],
    ["Leer (\"Nichts\")", "35 %"],
  ],
  [4500, 4500]
));
children.push(H3("Initiales Auswürfeln"));
children.push(P("Bei Rundenstart werden alle 29 Spots unabhängig voneinander mit der obigen Gewichtung ausgewürfelt."));
children.push(H3("Interaktion"));
children.push(Bullet("Durchsucht ein Spieler einen Spot mit Schrott oder Adrenalin, wird das Item eingesammelt und der Spot wird als Leer markiert."));
children.push(Bullet("War der Spot bereits leer, passiert nichts."));
children.push(H3("Regenerations-Regel"));
children.push(P("Leere Spots regenerieren NICHT automatisch auf einem festen Timer. Stattdessen gilt ein Schwellenwert-System:"));
children.push(Bullet("Das System verfolgt kontinuierlich, wie viele der 29 Spots aktuell leer sind."));
children.push(Bullet("Trigger-Bedingung: Regeneration ist nur aktiv, solange mehr als 9 Spots leer sind (≥ 10 von 29)."));
children.push(Bullet("Solange die Trigger-Bedingung erfüllt ist: Jeder leere Spot prüft unabhängig, alle 60 Sekunden, erneut ob die Schwelle noch erfüllt ist — falls ja, würfelt dieser Spot neu (60/5/35)."));
children.push(Bullet("Ist die Bedingung nicht erfüllt (≤ 9 leer): keine Regeneration, unabhängig von der verstrichenen Zeit. Leere Spots bleiben leer."));
children.push(P("Implementierungs-Ergebnis (aus der tatsächlichen Umsetzung): Jeder Spot besitzt einen eigenen, unabhängigen 60-Sekunden-Timer und prüft bei jedem eigenen Tick, ob die Schwelle gerade erfüllt ist. Dadurch entsteht automatisch ein Trickle-Effekt (weil die 29 Timer nicht synchron laufen) und die Schwelle wird kontinuierlich neu geprüft, nicht nur einmalig beim Überschreiten."));
children.push(H3("Was zählt als \"leer\"?"));
children.push(P("Sowohl ursprünglich als \"Nichts\" gewürfelte Spots als auch Spots, deren Schrott/Adrenalin bereits eingesammelt wurde, zählen zum Empty-Pool."));

children.push(H2("5.3 Erwartungswert-Rechnung (zur Einordnung der Balance)"));
children.push(simpleTable(
  ["Zustand", "Erwartete Anzahl von 29 Spots"],
  [
    ["Schrott", "≈ 17,4"],
    ["Adrenalin", "≈ 1,45"],
    ["Leer", "≈ 10,15"],
  ],
  [4500, 4500]
));
children.push(P("Ohne Regeneration läge die Wahrscheinlichkeit für \"0 Adrenalin in der Runde\" bei ca. 23 %, für \"genau 1\" bei ca. 34 % (Poisson-Näherung, λ ≈ 1,45). Durch die Regenerations-Regel (Kapitel 5.2) wird dieses Risiko über die Rundenzeit hinweg deutlich entschärft, weil sich verpasste Chancen bei Knappheit (> 9 leer) kontinuierlich nachfüllen."));
children.push(Note("Offene Designfrage, aktuell nicht abschließend geklärt: Ob \"Reviven ist selten möglich\" (hartes Permadeath-nahes Gefühl) oder \"Reviven ist riskant, aber bei Vorbereitung verlässlich verfügbar\" die gewünschte Zielrichtung ist. Die Antwort beeinflusst, ob 5 % der finale Wert bleibt oder im Playtesting angepasst werden sollte."));

// 6. FALLEN / TRAPS
children.push(H1("6. Fallen (Traps)"));
children.push(P("Grundidee: Jede Falle hat Vor- und Nachteile, z. B. mehr Schaden bei nur 1 Use, oder weniger Schaden bei dafür längerem Stun des Monsters."));
children.push(H2("6.1 Warum reine Zahlen-Trade-offs auf Dauer zu flach sind"));
children.push(P("\"Mehr Schaden bei 1 Use\" vs. \"weniger Schaden bei mehr Uses\" ist ein reiner Power-Trade-off (viel auf einmal vs. wenig aber öfter). Das führt langfristig fast immer zu einer mathematisch \"richtigen\" Wahl je nach Situation, statt zu einem echten taktischen Dilemma."));
children.push(H2("6.2 Vorschläge für Trade-offs mit echten Entscheidungs-Dimensionen"));
children.push(Bullet("Lautstärke vs. Stärke — eine starke Falle macht beim Auslösen Lärm und verrät die Position an alle Monster; eine schwache ist geräuschlos."));
children.push(Bullet("Reichweite vs. Setup-Zeit — sofort scharf, aber nur 1 Tile Wirkung, vs. 5 Sekunden Platzierzeit, dafür ganzer Raum abgedeckt."));
children.push(Bullet("Permanent vs. situativ — dauerhaft stehende Fallen wirken auf jedes vorbeikommende Monster (können aber gesehen/umgangen werden), Einmal-Überraschungsfallen treffen garantiert."));
children.push(Bullet("Gegen-Fallen-Mechanik für Monster — manche Fallen können vom Monster entschärft/umgangen werden, wenn es Zeit hat, wodurch ein Katz-und-Maus-Spiel um die Falle selbst entsteht (nicht nur um ihren Effekt)."));
children.push(Note("Status: Diese Trade-off-Dimensionen sind Vorschläge aus der Design-Diskussion und noch nicht final für alle Fallen-Typen festgelegt."));

// 7. DOWNED / REVIVE / ADRENALIN
children.push(H1("7. Downed-State, Revive & Adrenalin-System"));
children.push(H2("7.1 Downed-State — Bewegung & Kamera"));
children.push(Bullet("Der Downed-Spieler kann sich nicht bewegen."));
children.push(Bullet("Kamera wechselt in 3rd Person, damit er sich etwas umschauen kann — bewusst ohne großen Informationsvorteil (kein Freecam)."));
children.push(H3("Zu klärende Details (nicht final festgelegt)"));
children.push(Bullet("Kamera-Radius/Rotation sollte begrenzt sein (keine Zoom-Funktion, kein Peeken um Ecken/durch Wände, die man liegend nicht sehen könnte)."));
children.push(Bullet("Kommunikation während Downed (Voice/Callouts) kann den Malus faktisch aushebeln, wenn der Downed-Spieler zum \"Radar\" für sein Team wird — bewusste Entscheidung nötig, ob das gewollt ist oder eingeschränkt werden soll."));
children.push(Bullet("Leichte Sichteinschränkung (z. B. Rand-Unschärfe) kann das Hilflosigkeits-Gefühl verstärken, ohne die Kamera komplett zu sperren."));

children.push(H2("7.2 Zwei Revive-Pfade: Mit und ohne Adrenalin"));
children.push(simpleTable(
  ["", "Ohne Adrenalin", "Mit Adrenalin"],
  [
    ["Dauer", "Fix 25–35 Sekunden (leichte Zufallsvarianz, damit sich jeder Revive \"slightly different\" anfühlt)", "8 + ((n−1) × 2) Sekunden, n = wievielter Revive"],
    ["Kosten", "Keine Ressource nötig", "1 Adrenalin wird verbraucht"],
    ["Charakter", "Verzweiflungstat — nur realistisch, wenn Monster nachweislich weit weg/beschäftigt sind", "Echte taktische Option"],
  ],
  [2200, 3400, 3400]
));
children.push(P("Hinweis zur finalen Entscheidung: Der ursprünglich diskutierte Fixwert von exakt 30 Sekunden wurde bewusst zu einer kleinen Zufallsspanne (25–35s) erweitert, damit sich Reviven nicht wie ein exaktes, auswendig lernbares Countdown-Ritual anfühlt, sondern leicht unvorhersehbar bleibt — analog zur Zufallskomponente, die die Loot-Spot-Regeneration ohnehin schon mitbringt."));

children.push(H3("Eskalationsformel im Detail (mit Adrenalin)"));
children.push(simpleTable(
  ["Revive #", "Dauer"],
  [
    ["1.", "8 s"],
    ["2.", "10 s"],
    ["3.", "12 s"],
    ["4.", "14 s"],
    ["5.", "16 s"],
  ],
  [4500, 4500]
));
children.push(P("Die Formel wächst linear, nicht exponentiell — \"theoretisch unendlich, praktisch immer schwerer\", aber die Kurve bleibt sanft (nach 10 Revives liegt die Dauer erst bei 26s)."));
children.push(Note("Offene Frage, noch nicht final entschieden: Zählt \"n\" (der wievielte Revive) global pro Match oder pro Spieler individuell? Bei einer Pro-Spieler-Zählung könnten Monster gezielt denselben Spieler fokussieren, um dessen Revive-Kosten in die Höhe zu treiben — als Gegenvorschlag aus der Diskussion wurde eine globale, teamweite Zählung empfohlen, um dieses Anreizproblem zu vermeiden. Diese Entscheidung ist im aktuellen Implementierungs-Plan noch nicht explizit spezifiziert."));
children.push(Note("Ebenfalls offen: Ob es einen harten Cap auf die Anzahl möglicher Revives pro Spieler gibt (z. B. max. 3, danach permanent raus), und ob die Zählung beim Übergang in die Chase-Phase zurückgesetzt/halbiert wird. Der aktuelle Implementierungsstand sieht keinen Cap vor (theoretisch unendliche Revives)."));

children.push(H2("7.3 Adrenalin als seltener Loot-Drop"));
children.push(P("Adrenalin ist kein separates System, sondern ein seltener Ausgang desselben Loot-Rolls wie Schrott (siehe Kapitel 5.2) — 5 % Chance pro Spot, gebunden an dieselbe Regenerations-Logik."));
children.push(P("Vorteil dieses Ansatzes: kein zusätzliches Spawn-System, keine separate Inventar-Logik nötig — Adrenalin wird im Voraus gefunden und auf Vorrat gehalten, nicht im Moment der Krise erst besorgt (was den Revive-Moment doppelt bestrafen würde: Zeit + Weg zur Ressource)."));

children.push(H2("7.4 Warum \"einfaches Reviven\" als Problem erkannt wurde"));
children.push(P("Ursprüngliche Sorge: Reviven fühlte sich zu einfach/unfair an. Mögliche Ursachen, die in der Diskussion durchgegangen wurden:"));
children.push(Bullet("Kein echter Ressourcen-Preis (gelöst durch Adrenalin als Verbrauchsgut)."));
children.push(Bullet("Kein Limit an Wiederholungen (bewusst noch offen, siehe 7.2)."));
children.push(Bullet("Kein Nachteil nach dem Revive (z. B. kurzzeitiger Slow/Blutspur nach Wiederbelebung) — als Idee genannt, aktuell nicht im Implementierungs-Plan enthalten."));
children.push(Bullet("Kein Risiko für den Revivenden selbst (Doppel-Down-Möglichkeit während des Revive-Vorgangs) — als Idee genannt, Status im aktuellen Plan ungeklärt."));
children.push(P("Finale, tatsächlich umgesetzte Lösung: Der binäre Unterschied zwischen \"ohne Adrenalin\" (25–35s, praktisch ein Verzweiflungs-Gamble) und \"mit Adrenalin\" (8–16s+, echte taktische Option) wurde als ausreichend empfunden, um das Gefühl von \"zu einfach\" zu beheben, kombiniert mit der Seltenheit von Adrenalin selbst.", { bold: true }));

// 8. KARTENKONZEPT
children.push(H1("8. Kartenkonzept"));
children.push(P("Eine alte, L-förmige Villa mit Erdgeschoss, 1. Stock, Zwischendach und Dach sowie Keller. Rundherum ein schmaler Garten, dahinter Wald bis zum Horizont — in der Ferne nur schemenhaft erkennbare, verlassene Mehrfamilienhäuser als Kulisse, kein begehbarer Ort."));
children.push(Bullet("Pool (leer, verwittert) im hinteren Garten — Versteck- und Routenelement, potenzieller Code-Spot."));
children.push(Bullet("Holzschuppen (alte Garage) am Waldrand — Schrott-Hotspot mit eigenem Flair."));
children.push(Bullet("Breite Hauptstraße vor der Villa, gesäumt von Straßenlaternen — Ausgangspunkt der finalen Chase-Sequenz."));
children.push(Bullet("Straßensperre als Fixpunkt weiter entlang der Straße, mit Kreuzungen und Hindernissen bis zur Polizeistation."));
children.push(Bullet("Der Keller ist für Monster unter normalen Umständen unbetretbar, da sie dort Licht-Schaden nehmen — dadurch fungiert er als impliziter Safe Room für den Runner (siehe Kapitel 9.3)."));

// 9. SPECIAL EVENTS
children.push(H1("9. Special Events"));
children.push(H2("9.1 Wetterumschwung"));
children.push(P("Dichter Nebel lässt die Monster 50 % langsamer werden, während der Runner fast nichts mehr sieht. (Dient als Vorbild-Präzedenzfall für die Balance des Stromausfalls, siehe unten.)"));

children.push(H2("9.2 Stromausfall — Ursprüngliche Fassung & erkanntes Problem"));
children.push(P("Ursprüngliche Regel: Der Runner muss einen Schraubenzieher finden und die Sicherungsbox reparieren. Im Dunkeln haben die Monster freie Bahn."));
children.push(Note("Erkanntes Kernproblem: \"Freie Bahn\" kombiniert sich mit dem bestehenden Licht-Schaden-Malus der Monster. Der Stromausfall hebt gleichzeitig zwei Schutzmechanismen des Runners auf — Sicht UND den einzigen verlässlichen Schaden-Malus der Monster. Dadurch konnten Monster ohne jedes Risiko direkt durch die Eingangstür \"reinspazieren\" (Hail-Mary-Strategie ohne Gegenwert)."));

children.push(H2("9.3 Stromausfall — Finales, überarbeitetes Design"));
children.push(H3("Ablauf"));
children.push(Bullet("Der Blackout kommt überraschend (kein Bot-lesbarer fester Timer): Alle Lichter flackern 5 Sekunden lang."));
children.push(Bullet("Danach ertönt ein lauter Power-Off-Sound und alles wird dunkel — außer die Straße vor dem Haus, die weiterhin beleuchtet bleibt."));
children.push(Bullet("Die 5 Sekunden Flackern dienen als fairer Telegraph: Beide Seiten (Runner wie Monster) erhalten gleichzeitig dieselbe Vorwarnung und können sich in Richtung Keller in Bewegung setzen."));
children.push(H3("Balance-Gegenmaßnahmen gegen die \"Hail Mary\"-Strategie"));
children.push(Bullet("Monster werden während des Stromausfalls 50 % langsamer (analog zum bestehenden Nebel-Modifier) — kompensiert den Sichtverlust des Runners, ohne das Reinstürmen selbst zu einem Risiko zu machen."));
children.push(Bullet("Die Breaker Box wurde vom Garten (hinter dem Haus) in den Keller verlegt. Der Weg dorthin führt jetzt durch die Villa selbst statt durch offenes, deckungsarmes Außengelände — der Runner kann auf dem Weg reagieren, ausweichen oder sich kurz verstecken."));
children.push(Bullet("Da der Keller normalerweise für Monster durch Licht-Schaden unbetretbar ist, ist der Stromausfall der EINZIGE Zeitraum, in dem Monster überhaupt in den Keller können — das kehrt die ursprüngliche Dynamik um: Statt \"Blackout macht alles schlimmer\" gilt jetzt \"Blackout ist der einzige Moment, in dem der sonst sichere Rückzugsort gefährdet ist\"."));
children.push(Note("Aus der Diskussion identifiziertes Folgerisiko: Falls Monster wissen (oder lernen), dass die Box im Keller liegt, könnten sie sich VOR dem Blackout gezielt am einzigen Kellerzugang postieren, um sofort einzudringen, sobald es dunkel wird (\"Keller-Camping\"). Als möglicher Gegenmechanismus wurde ein kurzer Verzögerungs-Puffer angedacht (z. B. 2–3 Sekunden, bevor der Keller nach Blackout-Start tatsächlich betretbar wird), um campenden Monstern den sofortigen Zugriff zu verwehren. Diese Lösung ist als Vorschlag festgehalten, aber noch nicht final entschieden oder umgesetzt."));
children.push(Bullet("Ob der Keller mehrere Zugänge/Fluchtwege oder nur einen Ein-/Ausgang hat, ist eine offene Frage, die das Ausmaß des Camping-Risikos direkt beeinflusst — noch zu klären am tatsächlichen Layout."));

children.push(H3("Reparatur-Mechanik an der Breaker Box"));
children.push(P("Ursprüngliche Idee eines zusätzlich zu suchenden Schraubenziehers wurde verworfen, da sie die Mechanik zusätzlich erschwert hätte (zwei Suchziele statt eines). Finale Lösung:"));
children.push(Bullet("An der Box erscheinen 3 Proximity Prompts an leicht unterschiedlichen Positionen."));
children.push(Bullet("Die Prompts erscheinen sequenziell in fester Reihenfolge, mit leichtem Zufalls-Delay zwischen Fertigstellung eines Prompts und dem Erscheinen des nächsten."));
children.push(Bullet("Jeder Prompt benötigt ca. 1–3 Sekunden (randomisiert) zum Abschließen."));
children.push(Bullet("Ein bereits erschienener Prompt verschwindet nicht von selbst wieder — der Spieler kann die Reparatur in Etappen durchführen (z. B. Prompt 1 erledigen, kurz vor einem Monster flüchten, später zurückkehren und Prompt 2 abschließen)."));
children.push(Bullet("Da immer nur ein Prompt gleichzeitig aktiv/sichtbar ist, kann kein \"falscher Prompt in falscher Reihenfolge\"-Fehlerzustand entstehen."));
children.push(P("Kritische Erkenntnis aus der Diskussion: Die durchschnittliche Gesamt-Interaktionszeit von ca. 6 Sekunden ist für sich genommen unkritisch (\"chillig\") — kritisch wird sie ausschließlich in Kombination mit gleichzeitigem Monster-Verfolgungsdruck. Das Endprodukt (schwierig, aber nicht unfair) entsteht aus genau dieser Mischung, nicht aus der Reparaturzeit allein.", { bold: true }));
children.push(Note("Offen/zu testen: Ob das eigentliche Risiko-Szenario \"Monster campt gezielt vor dem Kellereingang und stürmt bei Blackout-Start sofort hinein\" oder \"Monster ist zufällig in der Nähe, ohne gezielt zu campen\" das dominante Problem darstellt — die Antwort entscheidet, ob der Verzögerungs-Puffer (s. o.) oder eine andere Stellschraube (z. B. kürzere Prompt-Zeiten, engere Zufallsspanne) die passendere Lösung ist. Im Gespräch wurde als wahrscheinlichere Ursache das Camping-Szenario identifiziert, aber nicht abschließend verifiziert."));

children.push(H3("Cue-Text-System (Onboarding-Bezug, siehe auch Kapitel 10)"));
children.push(P("Bei Stromausfall-Beginn erscheint ein kurzer, diegetischer Hinweistext (im Stil von Doors, z. B. bei \"I need a key...\"):"));
children.push(Quote("\"Ich sollte den Stromkasten finden, schnell!\""));
children.push(Bullet("Der Text soll bei JEDEM Vorkommen eines Stromausfalls erscheinen (nicht nur beim ersten Mal), da er situativ nützlich bleibt, nicht nur als einmaliges Lern-Event dient."));
children.push(Bullet("Der Text sollte automatisch verschwinden, sobald der Spieler die Box zum ersten Mal sieht/in Reichweite kommt — danach übernimmt der normale Interact-Prompt die Führung."));
children.push(Bullet("Vorschlag zur Wiederverwendung: Derselbe Cue-Text-Mechanismus könnte für weitere Erstkontakt-Momente recycelt werden, z. B. TV ohne Code berührt (\"Ich brauche einen Code dafür...\") oder Telefon zum ersten Mal berührt (\"Vielleicht kann ich hier was bestellen.\"). Dies wurde als offene Idee benannt, noch nicht final für alle Trigger-Punkte festgelegt."));

// 10. ONBOARDING
children.push(H1("10. Onboarding & implizites Lernen"));
children.push(H2("10.1 Ausgangsproblem"));
children.push(P("Anders als andere Horror-Spiele mit vielen Features (z. B. Doors) fehlt aktuell ein durchgängiges \"Guiding Light\"-Äquivalent oder eine Spielweise, bei der Spieler unbewusst durch Wiederholung lernen."));
children.push(P("Wichtige Einordnung: Der Vergleich mit Doors ist nur bedingt passend — Doors hat eine lineare Sequenz mit wenigen gleichzeitigen Systemen (laufen, Türen öffnen, gelegentlich verstecken). Outalive hat deutlich mehr parallele Systeme: Economy, Bestellsystem, Rollenwahl, Code-Hunt, TV-Unlock, Fallen, Breaker Box, Revive. Ein einzelnes Guiding-Light-Element kann das nicht allein tragen — es braucht mehrere zusammenspielende Schichten."));
children.push(P("Zentrale strukturelle Erkenntnis: Der Villa-Loop wiederholt sich nicht innerhalb einer Runde (anders als z. B. \"5 Generatoren\" bei Dead by Daylight), sondern nur EINMAL pro Runde, gefolgt vom Chase. Unbewusstes Lernen muss deshalb eher über mehrere Matches hinweg passieren (ähnlich wie bei Spielen wie Lethal Company), nicht innerhalb eines einzelnen Durchlaufs."));

children.push(H2("10.2 Lösungsansätze"));
children.push(H3("a) Rollen-getrennt lehren"));
children.push(P("Der Runner muss nicht wissen, wie Monster-Fähigkeiten funktionieren, und umgekehrt. Die Onboarding-Last wird direkt an der Rollenwahl aufgeteilt: Runner lernt Schrott → Telefon → Fallen → TV-Code → Breaker Box; Monster lernt eigene Fähigkeiten, Trap-Gefahren, Chase-Auslösung. Das halbiert effektiv, was jeder einzelne Spieler im ersten Match aufnehmen muss."));

children.push(H3("b) Diegetische Cues statt UI-Text"));
children.push(P("Der Zettel auf dem Nachttisch ist bereits ein Beispiel für dieses Prinzip — Kontext durch die Spielwelt selbst, nicht durch ein Tutorial-Overlay. Weitere Beispiele:"));
children.push(Bullet("Ein zweiter Notizzettel/Kritzelei neben dem Telefon deutet an: \"Schrott bringt Lieferungen.\""));
children.push(Bullet("Der TV zeigt sichtbar ein 4-stelliges Zahlenschloss beim Anfassen — kommuniziert \"hier braucht's einen Code\" rein visuell."));
children.push(Bullet("Die Sicherungsbox blinkt/funkt sichtbar bei Stromausfall — Ursache-Wirkung ist selbsterklärend, wenn visuell/akustisch klar inszeniert."));

children.push(H3("c) Kontextuelle Prompts statt permanenter UI"));
children.push(P("Ein Interact-Prompt zeigt beim ersten Antreffen eines Objekttyps kurz einen Hinweis (\"Hold E — durchsuchen\"), der danach dauerhaft verschwindet und nur noch das normale minimalistische Prompt zeigt. Standardtechnik für unbewusstes Lernen: einmal gelesen, aber eingeprägt."));

children.push(H3("d) Gestaffelte Komplexität"));
children.push(P("Nicht jedes System muss beim ersten Match verstanden werden. Der TV-Code-Hunt darf bewusst erst in Match 2–3 \"entdeckt\" werden — manche Systeme dürfen optional/spät auffindbar bleiben, statt alles sofort zu vermitteln."));

children.push(H3("e) Die anonyme Telefonstimme als Tutorial-Erzähler"));
children.push(P("Die bereits bestehende Stimme, die später den finalen Chase auslöst, kann auch früher im Spiel kurze, atmosphärische Hinweise geben, verkleidet als Lore statt als UI-Popup — z. B. beim ersten Schrott-Fund ein kurzes Knistern: \"Das ist kein Müll da draußen.\""));

children.push(H3("f) Optionales Practice-Match gegen Bots"));
children.push(P("Vor dem ersten echten Match, überspringbar, einmalig angeboten — Standard bei vergleichbaren asymmetrischen Titeln (z. B. Dead by Daylight), um neue Spieler nicht sofort an echten Gegnern zu \"verbrennen\", bevor sie die Systeme verstanden haben."));

children.push(H3("g) Großzügigere erste Runde"));
children.push(P("Falls technisch machbar: reduzierte Monster-Aggression oder leicht erhöhte Schrott-Spawnrate für Accounts, die zum ersten Mal spielen, damit niemand im ersten Match wegen unverstandener Systeme sofort abgestraft wird."));

children.push(H2("10.3 Konkret ausgearbeitet: Der einleitende Anruf"));
children.push(P("Anstatt UI-Tutorials zu zeigen, deckt ein einziger, in-fiction verpackter Anruf zu Rundenbeginn die absoluten Basics ab. Vorteil: Passt zur bestehenden Atmosphäre (dieselbe Telefonstimme, die später den finalen Chase auslöst), ist kurz genug, um nicht wie ein Vortrag zu wirken, und wirkt nicht wie ein Tutorial-Popup."));
children.push(H3("Ursprünglicher Entwurf, stichpunktartig"));
children.push(Bullet("Du bist ausgesetzt."));
children.push(Bullet("Überlebe, bis ich einen Ausweg für dich finde."));
children.push(Bullet("Es gibt Monster, pass auf!"));
children.push(Bullet("Du kannst mich anrufen, um wichtige Dinge zu bestellen."));
children.push(Bullet("Finde Schrott draußen als Bezahlung."));
children.push(Bullet("Ich schicke die Pakete per Van."));
children.push(H3("Ausformulierter Textvorschlag (Gerüst, Ton kann noch angepasst werden)"));
children.push(Quote("\"Du bist ausgesetzt. Überleb, bis ich einen Ausweg finde. Es gibt... andere hier draußen. Pass auf dich auf. Ruf mich an, wenn du was brauchst – ich schick's dir per Van, aber ich nehm kein Geld. Schrott tut's auch. Find welchen im Haus, im Garten – draußen liegt mehr, aber da bist du auch nicht sicher.\""));
children.push(P("Das Detail \"draußen liegt mehr, aber nicht sicher\" lehrt implizit den Risk/Reward-Loop des Schrott-Systems, ohne ihn explizit als Regel zu benennen."));
children.push(H3("Was der Anruf bewusst NICHT abdeckt"));
children.push(Bullet("TV & Code — bleibt unerklärt (bewusst spät entdeckbares System)."));
children.push(Bullet("Adrenalin/Revive — wird nicht vorab erklärt, da dieser Moment ohnehin organisch beim ersten tatsächlichen Downed-Ereignis gelernt wird."));
children.push(Bullet("Traps im Detail — \"wichtige Dinge bestellen\" ist bewusst vage genug, dass Traps mitgemeint sind, aber am Telefon-Menü selbst entdeckt werden."));
children.push(Bullet("Breaker Box/Stromausfall — nicht erwähnt, da das Event situativ selbsterklärend ist (Flackern + Sound + Cue-Text, siehe Kapitel 9.3)."));
children.push(P("Design-Prinzip: Der Anruf muss nicht jedes System vollständig erklären — er muss nur genug sagen, dass der Spieler weiß, wohin er als Nächstes schauen soll. Die Systeme selbst erklären sich dann durch Anfassen (Telefon-Menü zeigt Fallen, TV zeigt Zahlenschloss)."));
children.push(Note("Offen: Ob der Anruf einmalig übersprungen werden kann (Skip-Button für erfahrene Spieler, die ihn schon oft gehört haben) oder immer in voller Länge abläuft. Bei sehr erfahrenen Spielern könnte die volle Länge bei jeder Runde die Pacing-Geduld strapazieren."));

// 11. CHASE
children.push(H1("11. Finaler Chase"));
children.push(H2("11.1 Grundkonzept"));
children.push(P("Referenzpunkt: ähnlich wie die Seek-Chase-Sequenz aus Doors, jedoch mit dem entscheidenden Unterschied, dass ALLE Monster gleichzeitig den Runner verfolgen, statt nur einer einzelnen Entität."));
children.push(P("Dadurch verschiebt sich die Kernfrage fundamental: Bei Doors/Seek lautet die Frage \"wie entkomme ich EINER Bedrohung\". Bei Outalive lautet sie \"wie priorisiere/manage ich MEHRERE Bedrohungen mit potenziell unterschiedlichen Fähigkeiten gleichzeitig\" — näher an einem Multi-Enemy-Encounter als an einem klassischen 1v1-Chase."));

children.push(H2("11.2 Kartenlogik: Fixe Hauptkarte, zufällig generierter Chase"));
children.push(P("Die Villa (Hauptkarte) bleibt fix und lernbar — Spieler kennen mit der Zeit jeden Raum und jede Ecke, wo Schrott spawnt. Die Chase-Strecke hingegen wird pro Runde zufällig generiert, damit sie nie auswendig lernbar wird."));
children.push(P("Das behebt ein bekanntes Problem vieler asymmetrischer Horror-Spiele: Nach 20–30 Spielstunden wird eine feste Route auswendig gelernt, was den Grusel-/Spannungseffekt zunichtemacht."));
children.push(H3("Zu beachtende Punkte bei der prozeduralen Generierung (Vorschläge, noch nicht final spezifiziert)"));
children.push(Bullet("Balance-Grenzen statt komplett zufällig: garantierte Mindestanzahl an Abzweigungen, garantierte Verteilung von Deckung vs. offenen Strecken, damit keine durch Zufall unfaire oder witzlose Runde entsteht."));
children.push(Bullet("Seed-basierte Fairness bei mehreren Runden (z. B. Best-of-3 mit demselben Seed bei vertauschten Rollen)."));
children.push(Bullet("Landmark-Konsistenz: feste Ankerpunkte (Straßensperre, evtl. 1–2 wiederkehrende Gebäudetypen) für Orientierung, auch bei zufälliger Generierung."));
children.push(Bullet("Solvability/Testbarkeit: Es muss sichergestellt sein, dass immer ein theoretisch schaffbarer Pfad zur Polizeistation existiert (kein Softlock durch schlechte Generierung)."));

children.push(H2("11.3 Offene taktische Fragen zum Multi-Monster-Chase (noch nicht entschieden)"));
children.push(Bullet("Bewegen sich alle Monster mit derselben Taktik, oder unterschiedlich (direkte Verfolgung, Abschneiden/Flankieren, Fallen auf der Strecke)?"));
children.push(Bullet("Können sich Monster gegenseitig blockieren/im Weg stehen, sodass der Runner sie taktisch gegeneinander ausspielen kann?"));
children.push(Bullet("Ist die Straße linear oder gibt es echte Abzweigungen/Shortcuts mit Trade-offs (z. B. kürzer aber offener vs. länger aber mehr Deckung)?"));
children.push(Bullet("Was passiert, wenn ein einzelnes Monster den Runner verliert (Sicht-/Hörbereich-Mechanik), damit sich der Chase nicht wie unausweichliches Rubber-Banding anfühlt?"));

// 12. MODIFIER
children.push(H1("12. Modifier"));
children.push(P("Nach dem ersten Sieg in einer Rolle werden Modifier freigeschaltet, die das Spiel für beide Seiten leichter oder schwerer machen."));
children.push(simpleTable(
  ["Modifier", "Effekt"],
  [
    ["Vollmond", "Dunklere Sicht, Monster nehmen 50 % weniger Schaden im Licht"],
    ["Power Issue", "Stromausfälle sind doppelt so wahrscheinlich"],
    ["Ouch!", "Monster nehmen 20 % mehr Schaden"],
    ["Yikes!", "Monster nehmen 50 % mehr Schaden"],
    ["Fighter", "Monster nehmen 20 weniger Schaden"],
    ["Gym Bro", "Monster nehmen 50 % weniger Schaden"],
    ["Tuned Car", "Bestellungen werden deutlich schneller geliefert"],
    ["Second Chance", "Der Code spawnt an 2 statt an 1 Ort"],
    ["Look Behind You", "Monster sind durchgehend 20 % schneller"],
    ["Run for Your Life!", "Der finale Chase wird länger"],
    ["Good Shoes", "Der Runner ist 20 % schneller"],
    ["I Tripped!", "Der Runner ist 20 % langsamer"],
    ["Heavy Package!", "Bestellte Pakete wiegen doppelt so viel"],
    ["Out of Breath", "Sprinten ist für den Runner deaktiviert"],
    ["Keep It Spooky!", "Rollenverteilung 75 % Monster zu 25 % Runner"],
    ["Buddy", "Rollenverteilung 75 % Runner zu 25 % Monster"],
  ],
  [3000, 6000]
));

// 13. EDGE CASES
children.push(H1("13. Edge Cases"));
children.push(Bullet("Nur zwei Spieler in der Runde (ein Monster von Anfang an): Der Runner muss 5–10 zufällig bestimmte Minuten überleben, bis der Anruf kommt."));
children.push(Bullet("Alle Spieler eines Teams verlassen die Runde: Sofortiger Sieg für das andere Team."));
children.push(Bullet("Nur noch ein Monster verbleibt durch Verlassen (nicht durch Elimination): Der Anruf wird sofort ausgelöst, mit 5–10 Sekunden Verzögerung."));
children.push(Bullet("Alle Runner sterben: Die Monster gewinnen."));
children.push(Bullet("Alle Monster sterben, ohne dass der Chase ausgelöst wurde: Sie werden dennoch wiederbelebt."));

// 14. TECH / IMPLEMENTIERUNG
children.push(H1("14. Technischer Implementierungsstand (Loot & Revive)"));
children.push(P("Der folgende Stand basiert auf einem konkreten Umsetzungsplan (Roblox/TypeScript), der parallel mit mehr technischem Kontext entwickelt wurde. Er ist hier dokumentiert, inklusive identifizierter offener Punkte."));
children.push(H2("14.1 Server-seitig"));
children.push(Bullet("lootSystem.ts (ModuleScript): liest alle 29 Spots aus Workspace.PossibleItemLocations, würfelt initial (60/5/35), vergibt pro Spot einen eigenen ProximityPrompt (MaxActivationDistance = 8), aktualisiert bei Aktivierung Counter in ReplicatedStorage IntValues (ScrapAmount, VitaminAmount) und markiert den Spot als leer. Regeneration läuft pro Spot über einen unabhängigen 60s-Timer, der bei jedem Tick prüft, ob ≥ 10 Spots leer sind."));
children.push(Bullet("runnerDeath.server.ts: Normaler Revive (Head-Prompt) nutzt HoldDuration = math.random(25, 35). Adrenalin-Revive (UpperTorso-Prompt) nutzt HoldDuration = 8 + ((deaths − 1) × 2) und wird nur angezeigt, wenn VitaminAmount > 0. Bei Aktivierung wird VitaminAmount dekrementiert, ein neuer Charakter geladen und an die Todesposition teleportiert. Bei VitaminAmount = 0 werden alle Adrenalin-Prompts deaktiviert, bei Rückkehr über 0 wieder aktiviert für aktuell tote Spieler."));
children.push(H2("14.2 Client-seitig"));
children.push(Bullet("lootUI.client.ts: liest ScrapAmount/VitaminAmount und aktualisiert die entsprechenden HUD-Textlabels. Blendet beide Anzeigen komplett aus, falls role === \"Attacker\" (Monster)."));
children.push(Bullet("hideRevivePrompt.client.ts: deaktiviert zusätzlich alle Prompts, deren ActionText \"Adrenaline\" enthält, für Monster-Spieler."));

children.push(H2("14.3 Identifizierte offene Punkte aus dem Implementierungs-Review"));
children.push(Note("Naming-Inkonsistenz: Der Implementierungsplan nutzt intern \"VitaminAmount\"/\"Vitamin\" statt \"Adrenalin\". Falls das bewusst wegen Moderations-/Filterregeln für den Begriff \"Adrenalin\" gewählt wurde, ist das sinnvoll — falls es nur eine Inkonsistenz ist, sollte Code und Design-Dokumentation vereinheitlicht werden."));
children.push(Note("Sicherheitsaspekt: Das reine client-seitige Verstecken der Adrenalin-Prompts vor Monster-Spielern (\"hidden for monsters via client-side role check\") ist kein echter Schutz, wenn die Prompts serverseitig weiterhin ohne Rollenprüfung existieren — ein häufiger Exploit-Vektor in Roblox. Eine serverseitige Rollenvalidierung beim Prompt-Trigger selbst wird empfohlen, zusätzlich zum client-seitigen UI-Hiding."));
children.push(Note("Der Fixwert für den Revive ohne Adrenalin wurde im Implementierungsplan bewusst als math.random(25, 35) statt eines starren Wertes umgesetzt — dies ist eine gezielte Abweichung von einer früher diskutierten Fassung (starrer Wert von 30s) und wurde im Gespräch ausdrücklich bestätigt und begründet (siehe Kapitel 7.2)."));
children.push(Note("Der \"deaths\"-Zähler in der Adrenalin-Formel ist im Implementierungsplan nicht eindeutig als global oder pro Spieler spezifiziert (siehe Kapitel 7.2) — dies sollte vor finaler Umsetzung geklärt werden, sofern es nicht bereits in der ausführlicheren Parallel-Session mit mehr Kontext entschieden wurde."));
children.push(Bullet("Kein Revive-Cap im aktuellen Implementierungsstand (siehe 7.2)."));

// 15. OFFENE FRAGEN GESAMT
children.push(H1("15. Zusammenfassung: Offene Design-Fragen"));
children.push(P("Die folgenden Punkte wurden im Laufe der Diskussion als offen identifiziert und sind noch nicht final entschieden:"));
children.push(Bullet("Konkrete Werte/Fähigkeiten für 4–5 Monster-Archetypen (Starter + Unlockable) sowie die genaue Unlock-Progression."));
children.push(Bullet("Finale Trade-off-Dimensionen für alle Fallen-Typen (Lautstärke, Setup-Zeit, Permanenz, Gegen-Fallen-Mechanik)."));
children.push(Bullet("Kamera-Einschränkungen und Kommunikationsregeln für den Downed-State."));
children.push(Bullet("Ob \"n\" in der Adrenalin-Revive-Formel global oder pro Spieler gezählt wird."));
children.push(Bullet("Ob es einen harten Cap auf Revives pro Spieler/Match gibt, und ob die Zählung beim Übergang zur Chase-Phase zurückgesetzt wird."));
children.push(Bullet("Ob 5 % Adrenalin-Chance der finale Wert bleibt, abhängig von der gewünschten Grundhärte (\"selten möglich\" vs. \"riskant aber verlässlich\")."));
children.push(Bullet("Ob und wie ein Verzögerungs-Puffer das Keller-Camping-Verhalten von Monstern beim Stromausfall entschärfen soll, und wie viele Zugänge der Keller tatsächlich hat."));
children.push(Bullet("Taktische Verhaltensregeln für Monster im finalen Multi-Monster-Chase (einheitliche vs. differenzierte Taktik, gegenseitiges Blockieren, Verlust-Mechanik bei Sichtkontaktabbruch)."));
children.push(Bullet("Details der prozeduralen Chase-Generierung (Balance-Grenzen, Seed-Fairness, Landmark-Konsistenz, Solvability-Garantie)."));
children.push(Bullet("Ob der einleitende Tutorial-Anruf überspringbar sein soll für erfahrene Spieler."));
children.push(Bullet("Vereinheitlichung von Naming (Adrenalin vs. Vitamin) zwischen Design-Dokument und Code."));
children.push(Bullet("Serverseitige Rollenvalidierung für rollenspezifische Prompts (Sicherheitsthema, unabhängig vom Game-Design)."));

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: NAVY, font: "Calibri" },
        paragraph: { spacing: { before: 400, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: ACCENT, font: "Calibri" },
        paragraph: { spacing: { before: 300, after: 150 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: "374151", font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 } } },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const path = require("path");
  const outPath = path.join(__dirname, "Outalive_GDD_Vollstaendig.docx");
  require("fs").writeFileSync(outPath, buffer);
  console.log("Document created successfully");
});