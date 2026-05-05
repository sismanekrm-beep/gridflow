{
  "meta": {
    "product": "Etiket Yönetim Sistemi (TANEX TW-2024)",
    "app_type": "saas_app_dashboard",
    "language": "tr-TR",
    "north_star": "Üretim/Depo personelinin ürün kodu girip saniyeler içinde doğru etiketi hazırlayıp yazdırması (hatasız, hızlı, tekrarlanabilir).",
    "brand_attributes": [
      "endüstriyel ve güvenilir",
      "hız odaklı",
      "yüksek okunabilirlik",
      "print-first disiplin",
      "az hata / net durum geri bildirimi"
    ]
  },

  "inspiration_refs": {
    "ux_patterns": [
      {
        "title": "Manufacturing dashboard UX considerations (plant-floor readability, stale-data indicators)",
        "url": "https://fuselabcreative.com/manufacturing-dashboard-ux-design/"
      },
      {
        "title": "Dynamics 365 custom label layouts and printing (label layout mindset)",
        "url": "https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/custom-label-layouts-and-printing"
      },
      {
        "title": "Tanex TW-2024 template references (3x8 grid, 64x34mm)",
        "url": "https://hlabels.com/print/tanex/TW-2024/canva"
      }
    ],
    "layout_fusion": "Sol tarafta güçlü bir endüstriyel sidebar + üstte kompakt komut barı (search/quick actions) + içerikte bento-grid KPI kartları; Etiket Hazırlama ekranında sağda A4 önizleme paneli (sticky), solda hızlı giriş formu (command palette hissi)."
  },

  "design_tokens": {
    "css_custom_properties": {
      "notes": "Tailwind + shadcn HSL token yapısını koru; :root değerlerini endüstriyel palete göre güncelle. Gradient sadece hero/üst bant dekoru olarak %20 viewport kuralına uygun kullanılacak.",
      "root": {
        "--background": "210 25% 98%",
        "--foreground": "222 47% 11%",

        "--card": "0 0% 100%",
        "--card-foreground": "222 47% 11%",

        "--popover": "0 0% 100%",
        "--popover-foreground": "222 47% 11%",

        "--primary": "210 90% 28%",
        "--primary-foreground": "210 40% 98%",

        "--secondary": "210 20% 94%",
        "--secondary-foreground": "222 47% 11%",

        "--muted": "210 18% 95%",
        "--muted-foreground": "215 16% 40%",

        "--accent": "186 55% 92%",
        "--accent-foreground": "210 90% 22%",

        "--destructive": "0 72% 52%",
        "--destructive-foreground": "0 0% 98%",

        "--border": "214 20% 88%",
        "--input": "214 20% 88%",
        "--ring": "210 90% 35%",

        "--chart-1": "210 90% 35%",
        "--chart-2": "186 55% 40%",
        "--chart-3": "35 85% 55%",
        "--chart-4": "215 16% 45%",
        "--chart-5": "0 72% 52%",

        "--radius": "0.75rem",

        "--shadow-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
        "--shadow-md": "0 10px 30px rgba(15, 23, 42, 0.10)",
        "--shadow-inset": "inset 0 1px 0 rgba(255,255,255,0.7)",

        "--focus-outline": "0 0 0 3px rgba(14, 116, 144, 0.25)",

        "--space-page-x": "clamp(16px, 2.5vw, 28px)",
        "--space-page-y": "clamp(16px, 2.5vw, 28px)",

        "--sidebar-w": "272px",
        "--topbar-h": "56px"
      },
      "dark": {
        "notes": "Opsiyonel: üretim alanında düşük ışık için. Default light kalsın.",
        "--background": "222 47% 7%",
        "--foreground": "210 40% 98%",
        "--card": "222 47% 9%",
        "--card-foreground": "210 40% 98%",
        "--border": "215 20% 18%",
        "--input": "215 20% 18%",
        "--primary": "186 55% 45%",
        "--primary-foreground": "222 47% 7%",
        "--ring": "186 55% 55%"
      }
    },

    "palette": {
      "base": {
        "bg": "#F7FAFC (cool white)",
        "surface": "#FFFFFF",
        "ink": "#0F172A (slate-900)",
        "muted_ink": "#475569 (slate-600)",
        "border": "#D8E1EA"
      },
      "brand": {
        "primary": "#0B4F8A (industrial blue)",
        "primary_hover": "#0A4477",
        "accent": "#0E7490 (ocean teal)",
        "warning": "#D97706 (amber)",
        "danger": "#DC2626",
        "success": "#15803D"
      },
      "print": {
        "paper": "#FFFFFF",
        "ink": "#111827",
        "din_bar": "#E5E7EB",
        "hairline": "#D1D5DB"
      },
      "allowed_gradients": [
        {
          "name": "Topbar wash (decor only)",
          "css": "linear-gradient(90deg, rgba(14,116,144,0.10), rgba(11,79,138,0.06), rgba(255,255,255,0))"
        }
      ]
    },

    "typography": {
      "font_pairing": {
        "display": "Space Grotesk (600-700)",
        "body": "Inter (400-600)",
        "mono": "IBM Plex Mono (for product codes / DIN / ölçü)"
      },
      "google_fonts_import": "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');",
      "scale": {
        "h1": "text-4xl sm:text-5xl lg:text-6xl font-[700] tracking-tight",
        "h2": "text-base md:text-lg text-slate-600",
        "section_title": "text-lg font-[650] tracking-tight",
        "kpi_value": "text-3xl font-[700]",
        "table": "text-sm",
        "label_print": {
          "brand": "text-[9pt] font-[700]",
          "din": "text-[8pt] font-[600]",
          "field": "text-[7pt] font-[700] tracking-wide",
          "value_measure": "text-[14pt] font-[800]",
          "value_name": "text-[9pt] font-[700] leading-tight"
        }
      }
    },

    "radius_shadow": {
      "radius": {
        "card": "rounded-xl",
        "control": "rounded-lg",
        "pill": "rounded-full"
      },
      "shadow": {
        "card": "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
        "sticky_panel": "shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
      }
    },

    "spacing": {
      "principle": "Normalden 2-3x ferah: form alanları ve tablo üstü aksiyonlar arasında 16-24px; sayfa padding var(--space-page-x/y).",
      "page": "px-[var(--space-page-x)] py-[var(--space-page-y)]",
      "stack": "space-y-4 md:space-y-6",
      "inline": "gap-2 md:gap-3"
    }
  },

  "layout": {
    "grid_system": {
      "app_shell": "Desktop: 12-col content grid + fixed sidebar; Mobile: bottom sheet navigation or collapsible sidebar.",
      "content_max": "max-w-[1400px] (dashboard), label prep uses full width with split panes.",
      "dashboard": {
        "top": "KPI bento: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
        "lower": "2-col: left recent products (table), right quick actions + print queue"
      },
      "products": "Table-first: sticky toolbar + table; right drawer for add/edit on desktop.",
      "label_prep": "Split: left form (min-w 360), right A4 preview sticky top-4; on mobile preview becomes a tab.",
      "settings": "Single column form with logo uploader card"
    },

    "navigation": {
      "pattern": "Sidebar + topbar command strip",
      "sidebar_items": [
        "Gösterge Paneli",
        "Ürünler",
        "Etiket Hazırlama",
        "Ayarlar"
      ],
      "micro": "Active item: left border accent + subtle background; collapsed mode shows icons + tooltip."
    },

    "print_mode": {
      "rule": "Print view must render ONLY the A4 sheet and minimal header (optional). No sidebar/topbar.",
      "css": "@media print { .no-print { display:none !important; } .print-only { display:block !important; } body { background:#fff; } }",
      "preview_zoom": "Provide zoom 75/100/125% buttons; default 100%."
    }
  },

  "components": {
    "shadcn_primary": {
      "paths": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/label.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/separator.jsx",
        "/app/frontend/src/components/ui/sonner.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/command.jsx",
        "/app/frontend/src/components/ui/popover.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/checkbox.jsx",
        "/app/frontend/src/components/ui/calendar.jsx"
      ],
      "usage_map": {
        "fast_search": "Use Command (cmdk) as global product search (Ctrl+K) + quick actions (Yeni Ürün, Etiket Hazırla).",
        "product_form": "Dialog on mobile, Drawer/Sheet on desktop for add/edit; Form primitives from shadcn form.jsx if used.",
        "delete_confirm": "AlertDialog",
        "toast": "Sonner for success/error (e.g., 'Etiketler yazdırmaya hazır').",
        "tables": "Table with sticky header; Pagination component for 500+ products.",
        "filters": "Popover + Select + Checkbox"
      }
    },

    "custom_components_to_build": {
      "AppShell": {
        "description": "Sidebar + Topbar + Content container; handles print route hiding.",
        "data_testids": [
          "app-shell",
          "sidebar-nav",
          "topbar"
        ]
      },
      "KpiCard": {
        "description": "Icon + label + value + delta; clickable to filter products.",
        "tailwind": "rounded-xl border bg-card p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
        "data_testids": [
          "dashboard-kpi-total-products",
          "dashboard-kpi-recent-additions"
        ]
      },
      "ProductImageUploader": {
        "description": "Drag-drop + preview + remove; stores image URL.",
        "data_testids": [
          "product-image-uploader",
          "product-image-remove-button"
        ]
      },
      "LabelSheetPreview": {
        "description": "A4 page preview with 3x8 grid; each cell renders LabelCard (64x34mm).",
        "data_testids": [
          "label-sheet-preview",
          "label-sheet-zoom-in",
          "label-sheet-zoom-out",
          "label-sheet-print-button"
        ]
      },
      "LabelCard64x34": {
        "description": "Exact label layout: top image + brand + DIN bar; middle ÖLÇÜ + value; bottom ÜRÜN + name.",
        "data_testids": [
          "label-card"
        ]
      },
      "QuickCodeEntry": {
        "description": "Fast multi-code input (textarea) + parse lines; quantity per code; auto-fill from product DB.",
        "data_testids": [
          "label-code-entry-textarea",
          "label-code-entry-parse-button"
        ]
      }
    }
  },

  "page_blueprints": {
    "dashboard": {
      "structure": [
        "Topbar: global search (Ctrl+K), quick action buttons",
        "KPI grid (4 cards)",
        "Recent products table (left)",
        "Quick actions + print queue (right)"
      ],
      "key_ctas": [
        {
          "label": "Etiket Hazırla",
          "variant": "primary",
          "data-testid": "dashboard-go-to-label-prep-button"
        },
        {
          "label": "Yeni Ürün",
          "variant": "secondary",
          "data-testid": "dashboard-create-product-button"
        }
      ]
    },

    "urunler": {
      "structure": [
        "Sticky toolbar: search input + filters + 'Yeni Ürün'",
        "Table: code, name, ölçü, DIN, kalite, image thumb, actions",
        "Row actions: edit (opens drawer), delete (alert dialog)"
      ],
      "performance": "Use debounced search (250ms) + server-side pagination; show Skeleton rows while loading.",
      "data_testids": [
        "products-search-input",
        "products-create-button",
        "products-table",
        "products-row-edit-button",
        "products-row-delete-button"
      ]
    },

    "etiket_hazirlama": {
      "structure": [
        "Left: QuickCodeEntry + per-item quantity stepper + validation",
        "Right: LabelSheetPreview (sticky) with zoom + print",
        "Tabs on mobile: 'Giriş' and 'Önizleme'"
      ],
      "validation": [
        "Unknown product code -> inline error + toast",
        "Quantity must be >=1",
        "If more than 24 labels -> paginate A4 pages"
      ],
      "data_testids": [
        "label-prep-page",
        "label-prep-add-row-button",
        "label-prep-generate-preview-button",
        "label-prep-print-button"
      ]
    },

    "ayarlar": {
      "structure": [
        "Brand card: logo upload + brand name input",
        "Print defaults: margin offsets (x/y mm) + default zoom",
        "Save button"
      ],
      "data_testids": [
        "settings-brand-name-input",
        "settings-logo-upload-input",
        "settings-save-button"
      ]
    }
  },

  "label_spec": {
    "tanex_tw_2024": {
      "sheet": {
        "paper": "A4",
        "grid": "3 columns x 8 rows",
        "labels_per_sheet": 24,
        "label_size_mm": {
          "w": 64,
          "h": 34
        }
      },
      "rendering": {
        "approach": "Use CSS mm units for print accuracy; preview uses transform: scale() for zoom.",
        "a4_container_css": "width: 210mm; height: 297mm; padding: 0; background: #fff;",
        "grid_css": "display:grid; grid-template-columns: repeat(3, 64mm); grid-auto-rows: 34mm; gap: 0; justify-content:center; align-content:start;",
        "cell_css": "width:64mm; height:34mm; overflow:hidden; border: 0.2mm solid transparent;",
        "debug_grid_toggle": "Optional: show hairlines for alignment testing (not in print)."
      },
      "label_layout": {
        "top": {
          "left": "product image (square-ish, 18-20mm)",
          "right": "brand name + DIN bar",
          "din_bar": "full-width light gray bar with DIN965 etc"
        },
        "middle": {
          "field": "ÖLÇÜ",
          "value": "measurement (bold, largest text)"
        },
        "bottom": {
          "field": "ÜRÜN",
          "value": "product name (2 lines max, clamp)"
        }
      }
    }
  },

  "motion_microinteractions": {
    "principles": [
      "Motion = feedback: hover shadow, focus ring, pressed scale 0.98",
      "No distracting loops; production floor = calm",
      "Prefer transition-shadow, transition-colors, transition-opacity (never transition: all)"
    ],
    "framer_motion": {
      "use": "Optional for page transitions + drawer entrance; keep subtle.",
      "install": "npm i framer-motion",
      "patterns": [
        "KPI cards: onHover elevate",
        "Label preview: fade-in when regenerated"
      ]
    },
    "tailwind_snippets": {
      "button": "transition-colors transition-shadow duration-150",
      "card_hover": "transition-shadow duration-200",
      "press": "active:scale-[0.98]"
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast (especially table text and DIN bar)",
      "Visible focus states using ring + outline",
      "Keyboard: Ctrl+K opens Command search; Enter triggers primary action",
      "Touch targets: min-h-10 for buttons/inputs",
      "Print: ensure fonts are embedded/available; avoid low-contrast grays"
    ],
    "aria": [
      "Inputs must have Label components",
      "Icon-only buttons must have aria-label"
    ]
  },

  "images": {
    "image_urls": [
      {
        "category": "empty_state_illustration",
        "description": "Ürün bulunamadı / Etiket önizleme boş durumunda kullanılacak endüstriyel foto (blur + duotone overlay önerilir)",
        "url": "https://images.pexels.com/photos/257759/pexels-photo-257759.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "login_or_settings_header_bg_optional",
        "description": "Ayarlar sayfası üst bant dekoru (çok hafif opacity, %20 viewport kuralına uy)",
        "url": "https://images.unsplash.com/photo-1613948798757-2ea2ec0a6956?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "product_placeholder",
        "description": "Ürün görseli yoksa kullanılacak nötr placeholder (kendi SVG önerilir; bu foto sadece referans)",
        "url": "https://images.unsplash.com/photo-1614424428240-2da0a346808b?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "implementation_notes_js": {
    "react_files": "Project uses .js/.jsx. New components should be .jsx; pages .js. Avoid .tsx guidance.",
    "data_testid_rule": "All buttons/inputs/critical info must include data-testid in kebab-case.",
    "print_route": "Recommend a dedicated route like /print/labels that renders only LabelSheetPreview with print CSS.",
    "performance": "For 500+ products: server-side pagination + indexed search on product_code and product_name; UI uses debounced input and virtualization optional (react-virtual)."
  },

  "libraries_optional": {
    "react_to_print": {
      "why": "Reliable print trigger for a specific component (LabelSheetPreview).",
      "install": "npm i react-to-print",
      "usage": "Create ref to preview component; call handlePrint on button click. Ensure print CSS hides UI."
    },
    "react_virtual": {
      "why": "If table grows beyond 500 and needs ultra-fast scroll.",
      "install": "npm i @tanstack/react-virtual",
      "usage": "Virtualize rows; keep sticky header."
    }
  },

  "instructions_to_main_agent": {
    "global_css_changes": [
      "Replace CRA default App.css styles; remove centered header styles.",
      "In index.css: add Google Fonts import at top; set body font-family to Inter; headings use Space Grotesk via utility classes.",
      "Update :root HSL tokens to the values in design_tokens.css_custom_properties.root.",
      "Add print CSS utilities (.no-print, .print-only) and ensure print route uses them."
    ],
    "ui_build_priorities": [
      "1) AppShell (sidebar/topbar) + routing",
      "2) Ürünler table with fast search + drawer form + image upload",
      "3) Etiket Hazırlama split layout + A4 preview grid + print",
      "4) Settings brand/logo + print offsets",
      "5) Dashboard KPIs + recent products"
    ],
    "component_state_rules": [
      "Buttons: primary = --primary background; secondary = muted surface; ghost for icon actions.",
      "Destructive actions always require AlertDialog.",
      "Loading: Skeleton for tables and preview.",
      "Errors: inline under field + Sonner toast."
    ],
    "tailwind_class_starters": {
      "page": "min-h-screen bg-background text-foreground",
      "panel": "rounded-xl border bg-card p-4 shadow-[var(--shadow-sm)]",
      "toolbar": "sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b",
      "sidebar": "w-[var(--sidebar-w)] border-r bg-card",
      "topbar": "h-[var(--topbar-h)] border-b bg-background/80 backdrop-blur"
    }
  },

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>\n\nGeneral practice: the result should feel human-made, visually appealing, converting, and easy for AI agents to implement — with good contrast, balanced font sizes, proper gradients, sufficient whitespace, and thoughtful motion and hierarchy. The output must avoid overuse of elements and deliver a polished, effective design system."
}
