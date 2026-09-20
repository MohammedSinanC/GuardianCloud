/* ============================================================
 * WEBSITE CONTENT MODELS
 * ============================================================
 * Edit these interfaces to match your JSON structure.
 * The JSON file is at: public/assets/content/website-content.json
 * ============================================================ */

export interface CompanyInfo {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  workingHours: string;
  yearEstablished: number;
}

export interface NavLink {
  label: string;
  route: string;
  isHome?: boolean;
}

export interface Navigation {
  logo: string;
  links: NavLink[];
  ctaLabel: string;
}

export interface HeroContent {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  description: string;
  primaryButton: string;
  primaryRoute: string;
  secondaryButton: string;
  secondaryRoute: string;
  image: string;
  floatingCard: {
    icon: string;
    title: string;
    subtitle: string;
  };
}

export interface TrustItem {
  icon: string;
  title: string;
  description: string;
}

export interface Service {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: string;
  image: string;
  category: string;
  benefits: string[];
  process: string[];
  faq: FaqItem[];
}

export interface ServiceCategory {
  id: string;
  label: string;
}

export interface AboutContent {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  secondParagraph: string;
  image: string;
  secondaryImage: string;
  highlights: string[];
  mission: string;
  vision: string;
}

export interface WhyChooseUsItem {
  icon: string;
  title: string;
  description: string;
}

export interface StatisticItem {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

export interface Location {
  city: string;
  area: string;
  address: string;
  phone: string;
  workingHours: string;
  isMainBranch: boolean;
  mapUrl: string;
}

export interface Testimonial {
  id: number;
  name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  avatar: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ContactContent {
  title: string;
  subtitle: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  workingHours: string;
  services: string[];
  contract: string[];
  locations: string[];
}

export interface FooterContent {
  description: string;
  quickLinks: NavLink[];
  servicesLinks: NavLink[];
  copyright: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

export interface SeoPage {
  title: string;
  description: string;
  keywords?: string;
}

export interface SeoContent {
  home: SeoPage;
  services: SeoPage;
  about: SeoPage;
  contact: SeoPage;
  branches: SeoPage;
  faq: SeoPage;
}

export interface MasterDataItem {
  code: string;
  label: string;
  description?: string;
}

export interface ChecklistItem {
  code: string;
  name: string;
  controlType: 'TEXTBOX' | 'CHECKBOX';
}

export interface WebsiteContent {
  company: CompanyInfo;
  pestTypes: MasterDataItem[];
  inspectionTypes: MasterDataItem[];
  checklists: ChecklistItem[];
  serviceTypes: MasterDataItem[];
  contractTypes: MasterDataItem[];
  navigation: Navigation;
  hero: HeroContent;
  trust: TrustItem[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  about: AboutContent;
  whyChooseUs: WhyChooseUsItem[];
  statistics: StatisticItem[];
  process: ProcessStep[];
  locations: Location[];
  testimonials: Testimonial[];
  faq: FaqItem[];
  contact: ContactContent;
  footer: FooterContent;
  socialLinks: SocialLink[];
  seo: SeoContent;
}
