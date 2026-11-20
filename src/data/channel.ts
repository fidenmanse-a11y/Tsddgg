// Echte Daten des Kanals "Revanchie" (@RevanchieSMP, UC52JJMFwEJ9OTxujBdWLkqQ).
// Erhoben am 20.11.2026 direkt von youtube.com (Kanalseite /videos + YouTube-Suche).
// Thumbnails: i.ytimg.com/vi/<id>/maxresdefault.jpg (1280x720, Originale).
// Nichts hier ist erfunden – Titel und Aufrufzahlen sind 1:1 übernommen.

export type Video = {
  id: string;
  title: string;
  /** Aufrufe exakt wie auf YouTube angezeigt */
  views: string;
  viewsNum: number;
  published: string;
  duration: string;
  collab?: string;
};

export const CHANNEL = {
  name: "Revanchie",
  handle: "@RevanchieSMP",
  subscribers: "1820 Abonnenten",
  videoCount: "14 Videos",
  tagline: "Jo bin Revanchie mache SMP Videos",
  avatar: "channel/avatar.jpg",
  banner: "channel/banner.jpg",
};

export const VIDEOS: Record<string, Video> = {
  Rfj5lAsYpZs: { id: "Rfj5lAsYpZs", title: "Wir stahlen die 2 EINZIGEN MACES auf dem SMP…", views: "26.007", viewsNum: 26007, published: "vor 3 Monaten", duration: "20:25" },
  "0c5uPCQwZO0": { id: "0c5uPCQwZO0", title: "Ich entkam KNAPP dem BANN auf diesem Lifesteal SMP…", views: "21.635", viewsNum: 21635, published: "vor 2 Monaten", duration: "31:21" },
  QJw0v8rWq90: { id: "QJw0v8rWq90", title: "Ich VERBANNTE den GANZEN SMP mit meinem SPEAR-MACE...", views: "19.785", viewsNum: 19785, published: "vor 1 Monat", duration: "31:01" },
  WaBZP5Uy2nA: { id: "WaBZP5Uy2nA", title: "Dieses HOLZSCHWERT TÖTET JEDEN…", views: "18.442", viewsNum: 18442, published: "vor 5 Tagen", duration: "9:24" },
  cqVsmIshzLc: { id: "cqVsmIshzLc", title: "SPEAR MACE MASTER VS SPEAR MACE MASTER", views: "17.148", viewsNum: 17148, published: "vor 2 Monaten", duration: "25:51" },
  Eq2_E58U2S8: { id: "Eq2_E58U2S8", title: "Wir DOMINIERTEN den SchulSMP unserer MOBBER", views: "16.157", viewsNum: 16157, published: "", duration: "16:28", collab: "Revanchie und Nyxo" },
  tS_BQ12nfjk: { id: "tS_BQ12nfjk", title: "100 KOPFGELDJÄGER wollten mich vom Server bannen…", views: "14.588", viewsNum: 14588, published: "vor 2 Monaten", duration: "14:29" },
  "2oXza_81aYY": { id: "2oXza_81aYY", title: "Dieser Spieler schickte seine GANZE ARMEE auf mich…", views: "12.947", viewsNum: 12947, published: "vor 2 Monaten", duration: "13:09" },
  gtwiE_Cul84: { id: "gtwiE_Cul84", title: "Wie ich die ZERSTÖRUNG dieses Servers verhinderte", views: "12.405", viewsNum: 12405, published: "vor 2 Monaten", duration: "11:23" },
  rbj0AadIZtE: { id: "rbj0AadIZtE", title: "Dieses Item kann JEDEN Spieler bannen...", views: "10.397", viewsNum: 10397, published: "vor 2 Monaten", duration: "12:39" },
  "ZaLb3fu6j-Y": { id: "ZaLb3fu6j-Y", title: "GOD Maces VS Schul SMP", views: "6.724", viewsNum: 6724, published: "", duration: "20:22", collab: "Revanchie und Nyxo" },
  veJacP4gTIU: { id: "veJacP4gTIU", title: "ICH klaute die GOD ARMOR...", views: "6.672", viewsNum: 6672, published: "", duration: "15:43", collab: "Revanchie und Nyxo" },
  rAa4f9RQCP8: { id: "rAa4f9RQCP8", title: "Ich MEISTERTE 5 OP PvP STRATEGIEN", views: "4197", viewsNum: 4197, published: "vor 2 Tagen", duration: "11:14" },
  "QPQtvx-q1eo": { id: "QPQtvx-q1eo", title: "Ich bin DER SPEAR-MACE MASTER...", views: "3707", viewsNum: 3707, published: "vor 2 Wochen", duration: "12:19" },
};

/** Nach echten Aufrufen sortiert (meistgesehen zuerst) */
export const BY_VIEWS = Object.values(VIDEOS).sort((a, b) => b.viewsNum - a.viewsNum);

export const thumb = (id: string) => `thumbs/${id}.jpg`;
