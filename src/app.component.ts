
import { ChangeDetectionStrategy, Component, signal, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy, WritableSignal, Renderer2, QueryList, ViewChildren } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// Delcare lottie for type safety
declare var lottie: any;

interface Service {
  icon: string;
  title: string;
  description: string;
  image: string;
  features: string[];
  ctaText: string;
}

interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  author: string;
  company: string;
}

interface PortfolioItem {
  beforeImg: string;
  afterImg: string;
  title: string;
  category: string;
  description: string;
  url: string;
}

interface TechStack {
  name: string;
  icon: string;
}

interface ChatMessage {
  author: 'user' | 'bot';
  text: string;
}

interface KeyStat {
  value: string;
  label: string;
}

interface MeetingRequest {
  name: string;
  email: string;
  message: string;
  service: string | null;
  date: Date;
}

interface Subscriber {
  email: string;
  date: Date;
}


type FormStatus = 'idle' | 'submitting' | 'success' | 'error';
type SubscriptionStatus = 'idle' | 'subscribing' | 'success' | 'error';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  host: {
    '(window:scroll)': 'onScroll()'
  }
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private renderer = inject(Renderer2);
  private ai!: GoogleGenAI;
  
  @ViewChild('lottieRobotContainer') lottieRobotContainer!: ElementRef;
  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  @ViewChild('statsSection') statsSection!: ElementRef;
  @ViewChild('testimonialsSection') testimonialsSection!: ElementRef;
  @ViewChild('quoteMark') quoteMark!: ElementRef;
  @ViewChildren('animatable') animatableElements!: QueryList<ElementRef>;
  private observer?: IntersectionObserver;

  // UI State
  scrolled = signal(false);
  currentView = signal<'portfolio' | 'admin'>('portfolio');
  headerTitle = 'HATIM .B Consultant'.split('');

  // Admin State
  isAdminLoggedIn = signal(false);
  adminLoginError = signal<string | null>(null);
  
  // Forms & Statuses
  contactForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required],
  });

  subscriptionForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  adminLoginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  chatForm = this.fb.group({
    message: ['', Validators.required],
  });

  formStatus = signal<FormStatus>('idle');
  subscriptionStatus = signal<SubscriptionStatus>('idle');
  
  // Modal State
  isContactModalOpen = signal(false);
  selectedService = signal<string | null>(null);
  isWorkModalOpen = signal(false);
  selectedPortfolioItem = signal<PortfolioItem | null>(null);

  // Chatbot signals
  isChatOpen = signal(false);
  chatMessages = signal<ChatMessage[]>([
    { author: 'bot', text: "Hi! I'm HATIM's AI assistant. Ask me anything about his e-commerce expertise, services, or past projects!" }
  ]);
  isBotTyping = signal(false);
  chatError = signal<string | null>(null);

  // Data Signals
  meetingRequests = signal<MeetingRequest[]>([]);
  subscribers = signal<Subscriber[]>([]);


  constructor() {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      console.error("API_KEY environment variable not set.");
    }
  }

  ngAfterViewInit(): void {
    if (this.lottieRobotContainer) {
      lottie.loadAnimation({
        container: this.lottieRobotContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets6.lottiefiles.com/packages/lf20_d2y9r3i5h5.json' 
      });
    }
    this.initIntersectionObserver();
  }
  
  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  
  services = signal<Service[]>([
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.25a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75h3.75m-4.5 0v-7.5A.75.75 0 0 1 3 4.5h15a.75.75 0 0 1 .75.75v7.5m-18 0h3.75m14.25 0h3.75M3 21h18M12 3v18" /></svg>`,
        title: 'Premium Shopify Website Creation',
        description: 'We don\'t just build stores; we architect high-performance e-commerce experiences. From stunning custom designs to flawless international setups, we create conversion-optimized websites that serve as the ultimate foundation for your brand.',
        image: 'https://picsum.photos/seed/shopify-dev/1200/900',
        features: ['Custom Shopify Theme Design', 'Conversion-Focused UI/UX', 'Mobile-First Responsive Design', 'International Store Setup (Multi-language/Currency)', 'App Integration & Custom Features'],
        ctaText: 'Start Your Store Build'
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>`,
        title: 'Performance-Driven Digital Marketing',
        description: 'Attract high-value customers and achieve maximum ROI with our data-driven digital advertising strategies. We create, manage, and optimize campaigns across all major platforms to fuel your growth.',
        image: 'https://picsum.photos/seed/marketing-ads/1200/900',
        features: ['Meta Ads (Facebook & Instagram)', 'Google Ads (Search, Shopping, PMax)', 'TikTok & Snapchat Ad Campaigns', 'Retargeting & Funnel Optimization', 'Data Analytics & Reporting'],
        ctaText: 'Boost Your Ad ROI'
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>`,
        title: 'Automation & System Integration',
        description: 'Elevate your brand beyond the store with intelligent automation. We design powerful systems using Klaviyo and other tools to increase customer lifetime value, save time, and create delightful, personalized experiences.',
        image: 'https://picsum.photos/seed/automation-flow/1200/900',
        features: ['Advanced Klaviyo Email & SMS Flows', 'Customer Retention Systems', 'CRM & Workflow Integration', 'Shopify Flow Automation', 'AI-Powered System Design'],
        ctaText: 'Automate Your Growth'
      }
  ]);

  processSteps = signal<ProcessStep[]>([
    { step: '01', title: 'Audit & Strategy', description: 'We dive deep into your brand, audience, and goals to craft a bespoke roadmap for success.' },
    { step: '02', title: 'Design & Build', description: 'Our team designs and develops a high-performance, conversion-focused e-commerce presence.' },
    { step: '03', title: 'Automation & Optimization', description: 'We implement powerful automation systems and continuously optimize for peak performance.' },
    { step: '04', title: 'Scale & Accompaniment', description: 'As your long-term partner, we provide ongoing strategic guidance to scale your brand globally.' }
  ]);
  
  testimonials = signal<Testimonial[]>([
    {
      quote: "Working with them transformed our online store. The new design and automation systems have doubled our conversion rate. A true e-commerce architect.",
      author: 'Aisha Khan',
      company: 'Founder, Luxe Living Co.'
    },
    {
      quote: "Their strategic approach to international expansion was flawless. We now have a seamless multi-language store that caters to our global audience.",
      author: 'Benjamin Carter',
      company: 'CEO, Artisan Goods Intl.'
    },
    {
      quote: "The level of expertise in Klaviyo and Shopify automation is unmatched. Our email marketing revenue has increased by 150% in just six months.",
      author: 'Chloe Dubois',
      company: 'Marketing Director, Belle Mode'
    }
  ]);

  portfolioItems = signal<PortfolioItem[]>([
    { beforeImg: 'https://picsum.photos/seed/before1/800/600', afterImg: 'https://storage.googleapis.com/aistudio-hosting/workspace-assets/1a6f5e3e-4b7d-4c3e-9f3a-3f4c6b6d5f7b', title: 'Mobile-First Experience', category: 'UI/UX & Conversion', description: 'Designed a seamless and intuitive mobile shopping experience, featuring 3D product visualization and a streamlined checkout flow to boost conversion rates on mobile devices.', url: '#' },
    { beforeImg: 'https://picsum.photos/seed/before2/800/600', afterImg: 'https://storage.googleapis.com/aistudio-hosting/workspace-assets/5f8c61e4-6a8b-4b2a-8c4d-29c8e8783e4a', title: 'Custom T-Shirt Builder', category: 'Print On Demand', description: 'Developed a feature-rich "Print On Demand" t-shirt customizer, allowing users to select colors, styles, and upload their own designs, resulting in higher user engagement.', url: '#' },
    { beforeImg: 'https://picsum.photos/seed/before3/800/600', afterImg: 'https://picsum.photos/seed/after3/800/600', title: 'Momentum Watches', category: 'High-End Accessories', description: 'Crafted a premium, story-driven user experience for a luxury watchmaker, including 3D product views and an engraving customizer to elevate the brand and justify a high price point.', url: '#' }
  ]);

  techStack = signal<TechStack[]>([
    { name: 'Shopify', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>Shopify</title><path d="M13.284 22.492c-1.34-1.03-3.14-1.383-5.08-1.047C5.01 21.87 2.45 20.25 2.45 17.32c0-2.36 1.52-4.2 3.82-4.88 2.3-.69 4.85-.02 6.08 1.18l.01.01.01-.01c.06.05.12.1.18.15.19-.14.4-.28.61-.41 1.22-1.2 3.77-1.87 6.07-1.18 2.31.69 3.82 2.52 3.82 4.88 0 2.94-2.56 4.55-5.75 4.95-1.94.33-3.74 0-5.08 1.05zm-1.8-8.31c-1.42-.42-2.93-.16-3.86.6-1.16.95-1.4 2.22-1.4 3.03 0 1.25.75 2.31 2.53 2.31 1.1 0 2.3-.44 3.58-1.57l.01-.01c.21-.19.4-.39.59-.59.03-.03.06-.06.09-.09l.05-.05c.1-.12.2-.24.3-.36-1.02-1.2-2.14-1.63-1.98-1.63zM15.01 9.9c.16 0 .28-.47-.74-1.67-.16-.18-.32-.36-.49-.53-1.42-.42-2.93-.16-3.86.6-1.16.95-1.4 2.22-1.4 3.03 0 .19.02.37.05.55 1.74-.48 3.52-.16 4.88.94.52-.52.95-1.13 1.27-1.84.09-.2.19-.39.29-.58zm2.49 4.22c-1.27 1.13-2.48 1.57-3.58 1.57-1.78 0-2.53-1.06-2.53-2.31 0-.8.24-2.08 1.4-3.03.93-.76 2.44-1.02 3.86-.6.16 0 .28-.47-.74-1.67-.16-.18-.32-.36-.49-.53a5.53 5.53 0 0 0-3.86.6c-1.16.95-1.4 2.22-1.4 3.03 0 1.25.75 2.31 2.53 2.31.96 0 2.07-.36 3.23-1.32-.2-.2-.39-.4-.57-.59l-.07-.07c-.1-.12-.2-.24-.3-.36zM12 0c-1.35 1.03-3.15 1.38-5.09 1.04C3.72 2.61 1.17 4.23 1.17 7.16c0 2.36 1.52 4.2 3.82 4.88 2.3.69 4.85.02 6.08-1.18l.01-.01.01.01c.06-.05.12-.1.18-.15.19.14.4.28.61.41 1.22 1.2 3.77 1.87 6.07 1.18 2.31-.69 3.82-2.52 3.82-4.88 0-2.94-2.56-4.55-5.75-4.95C15.74.88 13.94.53 12.6 1.56 12.4 1.4 12.2 1.25 12 1.07V0z"/></svg>` },
    { name: 'Klaviyo', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>Klaviyo</title><path d="M12 0L.63 6.57v10.86L12 24l11.37-6.57V6.57L12 0zm0 2.13l9.44 5.45v8.84L12 21.87l-9.44-5.45V7.58L12 2.13zM6.63 7.82l-2.4 1.38v5.59l2.4 1.39V7.82zm10.74 0l-2.4 1.38v5.59l2.4 1.39V7.82zM12 8.7l-4.24 2.45v2.7l4.24 2.45 4.24-2.45v-2.7L12 8.7z"/></svg>` },
    { name: 'Meta', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>Meta</title><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 22.2c-5.63 0-10.2-4.57-10.2-10.2S6.37 1.8 12 1.8s10.2 4.57 10.2 10.2-4.57 10.2-10.2 10.2zm-1.8-11.66c0-2.26 1.4-3.1 3.6-3.1s3.6.84 3.6 3.1c0 2.26-1.4 3.1-3.6 3.1-2.2 0-3.6-.84-3.6-3.1zm-4.32 6.58c.28-.6.7-1.12 1.25-1.54.55-.42 1.2-.63 1.94-.63.75 0 1.4.21 1.94.63.55.42.97.94 1.25 1.54.3.62.44 1.3.44 2.05 0 .75-.15 1.43-.44 2.05-.28.6-.7 1.12-1.25 1.54-.55.42-1.2.63-1.94-.63-.75 0-1.4-.21-1.94-.63-.55-.42-.97-.94-1.25-1.54-.3-.62-.44-1.3-.44-2.05 0-.75.15-1.43.44-2.05z"/></svg>` },
    { name: 'Google', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>Google</title><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.438-3.386-7.438-7.574s3.343-7.574 7.438-7.574c2.33 0 3.891.989 4.785 1.85l3.25-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>` },
    { name: 'TikTok', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>TikTok</title><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.53 3.02 1.25 4.42.23.44.48.88.76 1.3.04.06.1.12.16.18.23.23.5.42.8.56.33.16.7.26 1.09.33.2.04.4.06.6.09.08.03.17.04.25.06a20.8 20.8 0 013.34 1.26c-.05.37-.1.72-.17 1.07-.18 1.18-.5 2.33-1.01 3.42-.41.87-.9 1.7-1.49 2.47-1.43 1.83-3.3 3.19-5.52 3.97a12.23 12.23 0 01-1.12.33c-.47.1-.95.17-1.42.22-.41.04-.82.06-1.23.07-.6.01-1.2.02-1.8.02-1.1 0-2.21 0-3.31-.01-.1-.02-.2-.04-.3-.06-.55-.08-1.1-.18-1.64-.31a20.45 20.45 0 01-3.3-1.26c.05-.37.1-.72.17-1.07.18-1.18.5-2.33 1.01-3.42.41-.87.9-1.7 1.49-2.47 1.43-1.83 3.3-3.19 5.52-3.97.47-.1.95-.17 1.42-.22.41-.04.82-.06 1.23-.07.6-.01 1.2-.02 1.8-.02 1.1 0 2.21-.01 3.31.01Zm1.19 1.63c-1.32 0-2.63 0-3.94 0-.03 1.22-.12 2.43-.31 3.63-.15.98-.38 1.95-.7 2.88-.3.87-.7 1.7-1.19 2.47-.12.18-.24.36-.37.54-.15.2-.3.4-.47.58-.2.2-.42.4-.66.56-.3.2-.64.36-1 .47-.22.07-.45.1-.68.14-.3.04-.6.07-.9.09-.12.01-.25.01-.37.01-1.04 0-2.08 0-3.12 0-.28 0-.56.02-.84-.02-.23-.04-.46-.08-.68-.14-.3-.07-.59-.15-.87-.26-.52-.2-1-.47-1.43-.79-.18-.13-.35-.27-.52-.42a17.43 17.43 0 00-1.88-1.85c.03-.18.06-.36.1-.53.18-1.02.48-2.02.88-2.98.5-1.2 1.15-2.32 1.9-3.35.42-.56.88-1.08 1.38-1.56.7-.67 1.48-1.24 2.32-1.72.5-.28 1.02-.5 1.54-.68.22-.07.45-.1.68-.14.3-.04.6-.07.9-.09.12-.01.25-.01.37-.01 1.04 0 2.08 0 3.12 0 .02 1.2.1 2.4.3 3.58.15.98.38 1.95.7 2.88.3.87.7 1.7 1.19 2.47.12.18.24.36.37.54.15.2.3.4.47.58.2.2.42.4.66.56.3.2.64.36 1 .47.22.07.45.1.68.14.3.04.6.07.9.09.12.01.25.01.37.01 1.04 0 2.08 0 3.12 0 .28 0 .56-.02.84.02.23.04.46.08.68.14.3.07.59-.15.87-.26.52.2 1-.47 1.43-.79.18-.13-.35-.27-.52-.42.5-.42.97-.87 1.4-1.36.03 1.18-.07 2.35-.3 3.5-.22 1.1-.55 2.18-1 3.22-.5.98-1.1 1.9-1.8 2.75-.42.5-.88.97-1.38 1.4-1.22 1.05-2.66 1.8-4.24 2.22-.4.1-.8.18-1.2.22Z"/></svg>` },
    { name: 'Snapchat', icon: `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 24 24" fill="currentColor"><title>Snapchat</title><path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12s12-5.372 12-12C24 5.373 18.627 0 12 0zm0 3.3c.734 0 1.333.599 1.333 1.333S12.734 6 12 6s-1.333-.6-1.333-1.333c0-.735.599-1.334 1.333-1.334zm0 17.4c-2.94 0-5.333-2.393-5.333-5.333S9.06 10.033 12 10.033c2.94 0 5.333 2.393 5.333 5.334s-2.393 5.333-5.333 5.333z"/></svg>` },
  ]);
  
  keyStats = signal<KeyStat[]>([
    { value: '50+', label: 'Shopify Stores Launched' },
    { value: '$10M+', label: 'Client Revenue Generated' },
    { value: '200%', label: 'Avg. Client Growth (YOY)' },
  ]);

  animatedStat1 = signal('0+');
  animatedStat2 = signal('$0M+');
  animatedStat3 = signal('0%');

  onScroll(): void {
    this.scrolled.set(window.scrollY > 50);
    this.handleParallax();
  }

  // --- FORM & MODAL LOGIC ---
  openContactModal(serviceTitle: string): void {
    this.selectedService.set(serviceTitle);
    this.isContactModalOpen.set(true);
  }

  closeContactModal(): void {
    this.isContactModalOpen.set(false);
    this.resetFormState();
  }
  
  openWorkModal(item: PortfolioItem): void {
    this.selectedPortfolioItem.set(item);
    this.isWorkModalOpen.set(true);
  }

  closeWorkModal(): void {
    this.isWorkModalOpen.set(false);
    setTimeout(() => this.selectedPortfolioItem.set(null), 300); // For exit animation
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    this.formStatus.set('submitting');
    this.contactForm.disable();
    
    setTimeout(() => {
      if (Math.random() > 0.1) {
        this.formStatus.set('success');
        const newRequest: MeetingRequest = {
          name: this.contactForm.value.name!,
          email: this.contactForm.value.email!,
          message: this.contactForm.value.message!,
          service: this.selectedService(),
          date: new Date()
        };
        this.meetingRequests.update(requests => [...requests, newRequest]);
        // Don't close modal immediately on success, show message
      } else {
        this.formStatus.set('error');
        this.contactForm.enable();
      }
    }, 1500);
  }
  
  onSubscribe(): void {
    if (this.subscriptionForm.invalid) {
      this.subscriptionForm.markAllAsTouched();
      return;
    }
    this.subscriptionStatus.set('subscribing');
    this.subscriptionForm.disable();

    setTimeout(() => {
      if (Math.random() > 0.1) {
        this.subscriptionStatus.set('success');
        const newSubscriber: Subscriber = {
          email: this.subscriptionForm.value.email!,
          date: new Date()
        };
        this.subscribers.update(subs => [...subs, newSubscriber]);
        this.subscriptionForm.reset();
        setTimeout(() => this.subscriptionStatus.set('idle'), 3000);
      } else {
        this.subscriptionStatus.set('error');
        setTimeout(() => this.subscriptionStatus.set('idle'), 3000);
      }
      this.subscriptionForm.enable();
    }, 1000);
  }

  resetFormState(): void {
    this.formStatus.set('idle');
    this.contactForm.enable();
    this.contactForm.reset();
  }

  scrollTo(elementId: string): void {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  }

  private initIntersectionObserver(): void {
    const options = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };

    if (typeof IntersectionObserver !== 'undefined') {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                  this.renderer.addClass(entry.target, 'visible');
                }
            });
        }, options);
        
        this.animatableElements.forEach(el => this.observer?.observe(el.nativeElement));

        if (this.statsSection?.nativeElement) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.startStatAnimations();
                        statsObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            statsObserver.observe(this.statsSection.nativeElement);
        }
    } else {
        // Fallback for older browsers
        this.animatableElements.forEach(el => this.renderer.addClass(el.nativeElement, 'visible'));
        this.startStatAnimations();
    }
  }

  private startStatAnimations(): void {
    this.animateCount(this.animatedStat1, 50, 2000, '+');
    this.animateCount(this.animatedStat2, 10, 2000, 'M+', '$');
    this.animateCount(this.animatedStat3, 200, 2000, '%');
  }

  private animateCount(signalToUpdate: WritableSignal<string>, endValue: number, duration: number, suffix: string = '', prefix: string = ''): void {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentValue = Math.floor(progress * endValue);
      signalToUpdate.set(`${prefix}${currentValue}${suffix}`);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        signalToUpdate.set(`${prefix}${endValue}${suffix}`);
      }
    };
    window.requestAnimationFrame(step);
  }

  private handleParallax(): void {
    if (this.currentView() === 'portfolio' && this.testimonialsSection && this.quoteMark) {
      const sectionEl = this.testimonialsSection.nativeElement as HTMLElement;
      const quoteEl = this.quoteMark.nativeElement as HTMLElement;
      const rect = sectionEl.getBoundingClientRect();

      if (rect.top < window.innerHeight && rect.bottom >= 0) {
        const parallaxSpeed = 0.2;
        const offset = (rect.top - (window.innerHeight / 2)) * parallaxSpeed;
        this.renderer.setStyle(quoteEl, 'transform', `translate(-50%, ${offset}px)`);
      }
    }
  }

  // --- VIEW & ADMIN MANAGEMENT ---
  showAdminView(): void { this.currentView.set('admin'); }
  showPortfolioView(): void {
    this.currentView.set('portfolio');
    this.adminLoginError.set(null);
    this.adminLoginForm.reset();
  }
  handleAdminLogin(): void {
    if (this.adminLoginForm.invalid) { return; }
    const { username, password } = this.adminLoginForm.value;
    if (username === 'admin' && password === 'password123') {
      this.isAdminLoggedIn.set(true);
      this.adminLoginError.set(null);
      this.adminLoginForm.reset();
    } else {
      this.adminLoginError.set('Invalid username or password.');
    }
  }
  logout(): void { this.isAdminLoggedIn.set(false); }


  // --- CHATBOT METHODS ---
  toggleChat(): void { this.isChatOpen.update(open => !open); }

  async handleChatSubmit(): Promise<void> {
    if (this.chatForm.invalid || !this.ai) return;

    const userMessage = this.chatForm.value.message as string;
    this.chatMessages.update(messages => [...messages, { author: 'user', text: userMessage }]);
    this.chatForm.reset();
    this.isBotTyping.set(true);
    this.scrollToBottom();

    try {
      const systemInstruction = `You are a multilingual AI assistant for the portfolio website of HATIM .B Consultant. Your primary goal is to respond to users in the same language they use. For example, if a user asks a question in French, you must answer in French. If they ask in Arabic or Moroccan Darija, you must respond fluently in that language.

      Your knowledge base is strictly limited to the information about HATIM .B provided below. Do not answer questions outside of this scope.

      **Consultant Information:**
      - **Name:** HATIM .B Consultant
      - **Role:** Senior E-commerce & Shopify Consultant
      - **Experience:** Over 5 years, creator of 50+ successful brands.
      - **Specialties:** Shopify Store Creation, E-commerce Accompaniment, Automation & Systems (especially Klaviyo), Performance Marketing & CRO (Meta Ads, Google Ads, TikTok Ads, Snapchat Ads).
      - **Key Achievements:** Launched 50+ high-converting Shopify Plus stores, guided clients to an average of 200% year-over-year growth, increased customer LTV by 40% with Klaviyo, achieved an average 3.5x ROAS, and generated over $10M in client revenue.
      - **Process:** A 4-step methodology: 1. Audit & Strategy, 2. Design & Build, 3. Automation & Optimization, 4. Scale & Accompaniment.

      **Your Role:**
      1.  **Language Mirroring:** Always answer in the user's language.
      2.  **Stay on Topic:** Politely decline to answer questions unrelated to HATIM .B's e-commerce services.
      3.  **Be Professional & Concise:** Encourage visitors to use the contact form for a detailed consultation.`;

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
        config: { systemInstruction: systemInstruction },
      });

      const botResponse = response.text;
      this.chatMessages.update(messages => [...messages, { author: 'bot', text: botResponse }]);
      this.chatError.set(null);

    } catch (error) {
      console.error("Gemini API error:", error);
      this.chatError.set("Sorry, I'm having trouble connecting. Please try again later.");
      this.chatMessages.update(messages => [...messages, { author: 'bot', text: "My apologies, I encountered an error. Please try asking again." }]);
    } finally {
      this.isBotTyping.set(false);
      this.scrollToBottom();
    }
  }
  
  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
      } catch (err) { }
    }, 0);
  }
}
