import { StyleSheet, Font } from '@react-pdf/renderer';

// ─── Emoji rendering (Twemoji via CDN) ───
Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
});

// ─── Hebrew font registration (Noto Sans Hebrew from Google Fonts) ───
Font.register({
  family: 'NotoSansHebrew',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sq0G1.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sq6e0.ttf',
      fontWeight: 700,
    },
  ],
});

// ─── Design tokens ───

export const C = {
  primary: '#6B4226', // deep walnut
  secondary: '#8B5E1A', // amber oak
  accent: '#C17B32', // warm amber
  accentLight: '#E8A030', // golden
  bg: '#FDF8F0', // parchment
  text: '#2D1A0E', // near-black
  muted: '#8B7355', // muted wood
  border: '#D4C4A0', // light wood
  headerBg: '#F0E8D8', // section header
  white: '#FFFFFF',
  coverTop: '#2C1206', // dark espresso cover band
  coverAccent: '#E8A030', // golden cover accent
  tableOdd: '#FAF6EF', // alternate table row
  tableHead: '#EDE4D4', // table header row
  statBorder: '#C4A87A',
  greenBadge: '#2D7A4F',
  blueBadge: '#1A4F7A',
  pageHeaderBg: '#F7F2EA',
  divider: '#C8B48A',
} as const;

// ─── Styles ───

export const s = StyleSheet.create({
  // ── Page layouts ──
  page: {
    paddingTop: 52,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    backgroundColor: C.white,
  },
  coverPage: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: C.bg,
  },

  // ── Fixed page header (content pages only) ──
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pageHeaderBg,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
    paddingHorizontal: 40,
  },
  pageHeaderBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    flex: 1,
  },
  pageHeaderSection: {
    fontSize: 8,
    color: C.muted,
    flex: 2,
    textAlign: 'center',
  },
  pageHeaderRight: {
    fontSize: 8,
    color: C.accent,
    flex: 1,
    textAlign: 'right',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.pageHeaderBg,
    paddingHorizontal: 40,
  },
  footerLeft: { fontSize: 7, color: C.muted, flex: 1 },
  footerCenter: { fontSize: 7, color: C.muted, flex: 1, textAlign: 'center' },
  footerRight: { fontSize: 7, color: C.accent, fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },

  // ── Cover ──
  coverTopBand: {
    backgroundColor: C.coverTop,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  coverBigEmoji: { fontSize: 42, marginBottom: 12 },
  coverMainTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: C.white, textAlign: 'center', letterSpacing: 2 },
  coverGoldLine: { width: 200, height: 2, backgroundColor: C.coverAccent, marginVertical: 14 },
  coverProjectName: {
    fontSize: 16,
    fontFamily: 'Helvetica-BoldOblique',
    color: C.coverAccent,
    textAlign: 'center',
    letterSpacing: 1,
  },
  coverMidBody: {
    backgroundColor: C.bg,
    flex: 1,
    paddingVertical: 36,
    paddingHorizontal: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInfoBox: {
    borderWidth: 1.5,
    borderColor: C.accent,
    borderRadius: 6,
    paddingVertical: 20,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 380,
    gap: 10,
  },
  coverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  coverInfoRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  coverInfoLabel: { fontSize: 9, color: C.muted, width: 130 },
  coverInfoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, flex: 1 },
  coverBottomStrip: {
    backgroundColor: C.coverTop,
    paddingVertical: 12,
    paddingHorizontal: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverBottomText: { fontSize: 8, color: '#B8996A' },
  coverBottomDate: { fontSize: 8, color: C.coverAccent, fontFamily: 'Helvetica-Bold' },

  // ── Sections ──
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.secondary,
    marginTop: 12,
    marginBottom: 5,
    paddingLeft: 2,
  },

  // ── Spec table ──
  specGroup: { marginBottom: 14 },
  specGroupTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  specLabel: { width: '45%', fontSize: 9, color: C.muted },
  specValue: { width: '55%', fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },

  // ── Stat boxes ──
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 14, marginTop: 4 },
  statBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.statBorder,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    backgroundColor: C.tableOdd,
  },
  statEmoji: { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.primary },
  statLabel: { fontSize: 7, color: C.muted, marginTop: 2, textAlign: 'center' },

  // ── Data tables ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.tableHead,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: C.tableOdd },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.primary },
  tdText: { fontSize: 8, color: C.text },

  // ── Guide text ──
  guideText: { fontSize: 9, color: C.text, marginBottom: 3, paddingLeft: 4 },
  guideIndent: { fontSize: 9, color: C.text, marginBottom: 2, paddingLeft: 22 },

  // ── Assembly steps ──
  assemblyStep: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textAlign: 'center',
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 2 },
  stepDesc: { fontSize: 8.5, color: C.muted, lineHeight: 1.4 },
});

// ─── Column widths ───
export const partsColWidths = ['7%', '23%', '5%', '18%', '11%', '11%', '8%', '17%'];
export const hwColWidths = ['45%', '15%', '20%', '20%'];
