import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Download,
  Eye,
  FilePlus2,
  Layers3,
  LoaderCircle,
  Menu,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Tablet,
  Trash2,
  Smartphone,
  WandSparkles,
  X,
} from "lucide-react";
import JSZip from "jszip";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import AuthPage from "./components/AuthPage";
import WebsitePreview from "./components/WebsitePreview";
const JsonEditor = lazy(() => import("./components/JsonEditor"));
import { generateTheme, generateWebsite } from "./services/api";
import { fetchProjects, loadProjects, saveProject, waitForProjectSaves } from "./services/projects";
import type { Project, SectionType, WebsiteSchema, WebsiteSection } from "./types";
import { isWebsiteSchema } from "./utils/websiteSchema";
import { createUuid } from "./utils/uuid";
import { useAuth } from "./contexts/useAuth";

const examples = [
  "A warm, editorial portfolio for an independent ceramic artist",
  "A refined landing page for a neighborhood wine bar",
  "A calm wellness studio with memberships and class schedules",
];

const sectionOptions: { type: SectionType; label: string }[] = [
  { type: "hero", label: "Hero" },
  { type: "about", label: "About" },
  { type: "features", label: "Features" },
  { type: "services", label: "Services" },
  { type: "products", label: "Products" },
  { type: "categories", label: "Categories" },
  { type: "gallery", label: "Gallery" },
  { type: "menu", label: "Menu" },
  { type: "faq", label: "FAQ" },
  { type: "banner", label: "Promo banner" },
  { type: "team", label: "Team" },
  { type: "stats", label: "Stats" },
  { type: "process", label: "Process" },
  { type: "events", label: "Events" },
  { type: "blog", label: "Articles" },
  { type: "location", label: "Location" },
  { type: "schedule", label: "Schedule" },
  { type: "logos", label: "Client logos" },
  { type: "pricing", label: "Pricing" },
  { type: "testimonials", label: "Testimonials" },
  { type: "contact", label: "Contact" },
  { type: "footer", label: "Footer" },
];

const emptyWebsite: WebsiteSchema = {
  title: "",
  description: "",
  theme: { primary: "#7c5cff", background: "#ffffff", text: "#171717" },
  sections: [],
};

function makeSection(type: SectionType): WebsiteSection {
  const label = sectionOptions.find((option) => option.type === type)?.label || "Section";
  return {
    id: `${type}-${createUuid()}`,
    type,
    heading: type === "hero" ? "Your next big idea starts here." : `${label}, thoughtfully made.`,
    subheading: "A little more detail makes all the difference.",
    body: "",
    items: [],
    cards: [],
  };
}

function updateCard(section: WebsiteSection, index: number, updates: Partial<NonNullable<WebsiteSection["cards"]>[number]>) {
  const cards = [...(section.cards || [])];
  cards[index] = { ...cards[index], ...updates };
  return cards;
}

function ProjectExport({ website }: { website: WebsiteSchema }) {
  async function exportProject() {
    const zip = new JSZip();
    const json = JSON.stringify(website, null, 2);
    const component = `import site from "./website.json";\n\nexport default function App() {\n  return <main className="min-h-screen" style={{ color: site.theme.text, backgroundColor: site.theme.background }}>\n    <nav className="border-b border-black/10 px-8 py-5 font-semibold">{site.title}</nav>\n    {site.sections.map((section) => <section key={section.id} className="mx-auto max-w-5xl px-8 py-16">\n      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: site.theme.primary }}>{section.type}</p>\n      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{section.heading}</h1>\n      <h2 className="mt-4 text-lg opacity-75">{section.subheading}</h2><p className="mt-3 max-w-2xl leading-7 opacity-75">{section.body}</p>\n              {section.cards?.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">{section.cards.map((card) => <article className="overflow-hidden rounded-xl border border-black/10" key={card.title}>{card.imageUrl && <img className="h-48 w-full object-cover" src={card.imageUrl} alt={card.title} />}{card.imagePage && <a className="block px-5 pt-3 text-xs opacity-70" href={card.imagePage} target="_blank" rel="noreferrer">Image: {card.imageCredit || "Wikimedia Commons"} · {card.imageLicense || "License"}</a>}<div className="p-5"><h3 className="font-medium">{card.title}</h3><p className="mt-2 text-sm opacity-75">{card.description}</p>{card.price && <strong className="mt-3 block">{card.price}</strong>}</div></article>)}</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">{section.items?.map((item) => <article className="rounded-xl border border-black/10 p-5" key={item}>{item}</article>)}</div>}\n    </section>)}\n  </main>;\n}\n`;
    zip.file("src/App.jsx", component);
    zip.file("src/website.json", json);
    zip.file("package.json", JSON.stringify({
      name: website.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "canvas-site",
      version: "1.0.0",
      private: true,
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { "@vitejs/plugin-react": "^4.3.4", "@tailwindcss/vite": "^4.3.3", tailwindcss: "^4.3.3", vite: "^6.0.5", react: "^18.3.1", "react-dom": "^18.3.1" },
      devDependencies: {},
    }, null, 2));
    const safeTitle = website.title.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] || character);
    zip.file("index.html", `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${safeTitle}</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`);
    zip.file("src/main.jsx", 'import React from "react"; import { createRoot } from "react-dom/client"; import App from "./App"; import "./index.css"; createRoot(document.getElementById("root")).render(<App />);');
    zip.file("src/index.css", '@import "tailwindcss";\n');
    zip.file("vite.config.js", 'import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; import tailwindcss from "@tailwindcss/vite"; export default defineConfig({ plugins: [react(), tailwindcss()] });');
    zip.file("README.md", `# ${website.title}\n\nA website generated with Canvas AI Website Builder.\n\n## Run locally\n\n1. Install Node.js 20.19 or newer.\n2. Run \`npm install\`.\n3. Run \`npm run dev\`.\n\nCustomize the content in \`src/website.json\` and layout in \`src/App.jsx\`.\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${website.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "canvas-site"}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Your website project is ready to download.");
  }

  return <button className="export-button" onClick={exportProject}><Download size={15} /> Export <ChevronDown size={13} /></button>;
}

function Studio() {
  const { configured, user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>(configured ? [] : loadProjects);
  const [projectId, setProjectId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [website, setWebsite] = useState<WebsiteSchema>(emptyWebsite);
  const [generating, setGenerating] = useState(false);
  const [panel, setPanel] = useState<"design" | "code">("design");
  const [mode, setMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedId, setSelectedId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [darkPreview, setDarkPreview] = useState(false);
  const [draggingId, setDraggingId] = useState("");
  const [generatingPalette, setGeneratingPalette] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimers = useRef(new Map<string, number>());
  const saveSequence = useRef(0);

  const selectedSection = website.sections.find((section) => section.id === selectedId);
  const jsonValue = useMemo(() => JSON.stringify(website, null, 2), [website]);
  const userId = user?.id;
  const displayName = typeof user?.user_metadata.display_name === "string"
    ? user.user_metadata.display_name
    : user?.email || "Account";

  useEffect(() => {
    if (panel !== "code") setJsonDraft(jsonValue);
  }, [jsonValue, panel]);

  useEffect(() => {
    if (!configured || !userId) return;
    let active = true;
    void fetchProjects().then((loaded) => {
      if (active) setProjects((current) => [
        ...current,
        ...loaded.filter((project) => !current.some((item) => item.id === project.id)),
      ].slice(0, 30));
    }).catch((error) => {
      console.error("Unable to load account projects:", error);
      toast.error("Could not load your saved projects. Check your connection and try again.");
    });
    return () => { active = false; };
  }, [configured, userId]);

  function saveToAccount(project: Project, immediate = false) {
    const sequence = ++saveSequence.current;
    const pending = saveTimers.current.get(project.id);
    if (pending) window.clearTimeout(pending);
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      saveTimers.current.delete(project.id);
      void saveProject(project).then((savedProjects) => {
        setProjects((current) => [
          ...current,
          ...savedProjects.filter((project) => !current.some((item) => item.id === project.id)),
        ].slice(0, 30));
        if (sequence === saveSequence.current) setSaveStatus("saved");
      }).catch((error) => {
        console.error("Unable to save account project:", error);
        if (sequence === saveSequence.current) {
          setSaveStatus("error");
          toast.error("Your edit is visible, but could not be saved to your account.");
        }
      });
    }, immediate ? 0 : 500);
    saveTimers.current.set(project.id, timer);
  }

  function persist(nextWebsite: WebsiteSchema, nextPrompt = prompt, id = projectId, immediateSave = false) {
    setWebsite(nextWebsite);
    if (!nextPrompt.trim()) return;
    const project: Project = {
      id: id || createUuid(),
      prompt: nextPrompt,
      website: nextWebsite,
      createdAt: projects.find((item) => item.id === id)?.createdAt || new Date().toISOString(),
    };
    setProjectId(project.id);
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)].slice(0, 30));
    saveToAccount(project, immediateSave);
  }

  async function handleGenerate(value = prompt) {
    if (!value.trim()) {
      toast.error("Add a short description of the website you want to create.");
      return;
    }
    if (value.trim().length < 3) {
      toast.error("Please add a little more detail (at least 3 characters).");
      return;
    }
    setGenerating(true);
    setPrompt(value);
    try {
      const result = await generateWebsite(value.trim());
      const id = createUuid();
      persist(result, value.trim(), id, true);
      setSelectedId(result.sections[0]?.id || "");
      setPanel("design");
      toast.success("Your new site is ready to explore.");
    } catch (error) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
          || (error.code === "ECONNABORTED"
            ? "Website generation took too long. Please try again."
            : "Could not reach Canvas. Check that the frontend and API are running and try again.")
        : "Website generation failed unexpectedly. Please try again.";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  function updateSection(id: string, updates: Partial<WebsiteSection>) {
    persist({ ...website, sections: website.sections.map((section) => section.id === id ? { ...section, ...updates } : section) });
  }

  function moveSection(id: string, direction: -1 | 1) {
    const index = website.sections.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= website.sections.length) return;
    const sections = [...website.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    persist({ ...website, sections });
  }

  function reorder(dragId: string, targetId: string) {
    const from = website.sections.findIndex((section) => section.id === dragId);
    const to = website.sections.findIndex((section) => section.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const sections = [...website.sections];
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    persist({ ...website, sections });
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    reorder(draggingId, targetId);
    setDraggingId("");
  }

  function updateTheme(key: keyof WebsiteSchema["theme"], value: string) {
    persist({ ...website, theme: { ...website.theme, [key]: value } });
  }

  function loadProject(project: Project) {
    setProjectId(project.id);
    setPrompt(project.prompt);
    setWebsite(project.website);
    setSelectedId(project.website.sections[0]?.id || "");
    setSidebarOpen(false);
    setJsonError("");
  }

  function startNew() {
    setProjectId("");
    setPrompt("");
    setWebsite(emptyWebsite);
    setSelectedId("");
    setSidebarOpen(false);
  }

  async function handleSignOut() {
    try {
      const pendingIds = [...saveTimers.current.keys()];
      const pendingProjects = pendingIds
        .map((id) => projects.find((item) => item.id === id))
        .filter((project): project is Project => Boolean(project));
      for (const id of pendingIds) {
        const timer = saveTimers.current.get(id);
        if (timer) window.clearTimeout(timer);
        saveTimers.current.delete(id);
      }
      await Promise.all(pendingProjects.map((project) => saveProject(project)));
      await waitForProjectSaves();
      await signOut();
    } catch (error) {
      console.error("Unable to end the authentication session:", error);
      toast.error("Could not save pending changes or sign out. Check your connection and try again.");
    }
  }

  function updateJson(value: string | undefined) {
    setJsonDraft(value || "");
    try {
      const parsed: unknown = JSON.parse(value || "");
      if (!isWebsiteSchema(parsed)) throw new Error("Schema mismatch");
      setWebsite(parsed);
      setJsonError("");
      if (prompt.trim()) {
        const id = projectId || createUuid();
        const project: Project = { id, prompt, website: parsed, createdAt: projects.find((item) => item.id === id)?.createdAt || new Date().toISOString() };
        setProjectId(project.id);
        setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)].slice(0, 30));
        saveToAccount(project);
      }
    } catch {
      setJsonError("JSON is incomplete or invalid. Fix it before returning to design view.");
    }
  }

  function toggleDarkPreview() {
    const isDark = !darkPreview;
    setDarkPreview(isDark);
    persist({
      ...website,
      theme: {
        ...website.theme,
        background: isDark ? "#101115" : "#ffffff",
        text: isDark ? "#f1f0ee" : "#171717",
      },
    });
  }

  async function handlePalette() {
    setGeneratingPalette(true);
    try {
      const theme = await generateTheme(prompt.trim() || website.title || "A polished, modern creative studio");
      persist({ ...website, theme });
      setDarkPreview(false);
      toast.success("A fresh color palette is ready.");
    } catch (error) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error || "Could not reach Canvas. Check that the frontend and API are running and try again."
        : "Palette generation failed unexpectedly. Please try again.";
      toast.error(message);
    } finally {
      setGeneratingPalette(false);
    }
  }

  function addSection(type: SectionType) {
    const section = makeSection(type);
    persist({ ...website, sections: [...website.sections, section] });
    setSelectedId(section.id);
  }

  function addContentCard(section: WebsiteSection) {
    const cards = [...(section.cards || [])];
    if (cards.length >= 8) {
      toast.error("A section can have up to 8 cards.");
      return;
    }
    cards.push({
      title: "New item",
      description: "Add a short description.",
      price: "",
      badge: "",
      visual: "general",
    });
    updateSection(section.id, { cards });
  }

  function deleteSection(id: string) {
    const sections = website.sections.filter((section) => section.id !== id);
    persist({ ...website, sections });
    setSelectedId(sections[0]?.id || "");
    toast.success("Section removed.");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row"><Link to="/" className="brand-logo"><span className="brand-symbol"><Sparkles size={17} /></span><span>canvas<span className="brand-period">.</span></span></Link><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={17} /></button></div>
        <button className="new-project" onClick={startNew}><Plus size={16} /> New project <kbd>Ctrl K</kbd></button>
        <div className="sidebar-label"><span>YOUR WORKSPACE</span><button aria-label="New project" onClick={startNew}><Plus size={14} /></button></div>
        <div className="project-list">
          {projects.length ? projects.map((project) => (
            <button className={`project-link ${projectId === project.id ? "active" : ""}`} key={project.id} onClick={() => loadProject(project)}>
              <span className="project-dot" /><span className="project-name">{project.website.title || project.prompt}</span>
            </button>
          )) : <div className="sidebar-empty">Your projects will appear here.</div>}
        </div>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-card-icon"><Sparkles size={15} /></div><div><strong>Creative workspace</strong><span>Your projects, all here</span></div><ArrowRight size={14} /></div>
          {user
            ? <button className="user-card" onClick={() => void handleSignOut()} title="Sign out"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><strong>{displayName}</strong><span>Sign out</span></div><ChevronDown size={15} /></button>
            : <div className="user-card guest-mode-indicator"><div className="avatar">G</div><div><strong>Guest workspace</strong><span>Projects saved in this browser</span></div></div>}
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}
      <main className="studio-main">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button sidebar-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={18} /></button><span className="breadcrumb-muted">Workspace</span><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">{website.title || "Untitled project"}</span><span className={`saved-indicator ${saveStatus}`}><span />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "All changes saved"}</span></div>
          <div className="topbar-actions">{!user && <><Link className="top-link" to="/login">Log in</Link><Link className="top-signup" to="/signup">Sign up <ArrowRight size={14} /></Link></>}</div>
        </header>

        <div className="work-area">
          <section className="editor-pane">
            <div className="pane-heading"><div className="pane-icon"><WandSparkles size={17} /></div><div><span className="eyebrow">YOUR CREATIVE PARTNER</span><h1>Make it yours.</h1></div><span className="step-pill">01 <span>/</span> 03</span></div>
            <p className="pane-description">Start with a thought. We&apos;ll help you shape it into something real.</p>

            <label className="prompt-label" htmlFor="site-prompt">DESCRIBE YOUR WEBSITE</label>
            <div className="prompt-box"><textarea id="site-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void handleGenerate(); }} placeholder="A thoughtful portfolio for a creative studio, with a bold hero and a little room to breathe..." maxLength={2000} /><div className="prompt-footer"><span><Sparkles size={12} /> Be as specific as you like</span><span>{prompt.length}/2000</span></div></div>
            <button className="generate-button" onClick={() => void handleGenerate()} disabled={generating}>{generating ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{generating ? "Dreaming up your website..." : "Generate website"}{!generating && <ArrowRight size={15} />}</button>
            <div className="examples-row"><span>TRY A STARTING POINT</span>{examples.map((example) => <button key={example} onClick={() => setPrompt(example)} title={example}>{example}</button>)}</div>

            <div className="editor-divider"><span>MAKE IT YOURS</span><span>{website.sections.length ? `${website.sections.length} sections` : "Your canvas is waiting"}</span></div>
            <div className="editor-tabs"><button className={panel === "design" ? "selected" : ""} onClick={() => setPanel("design")}><Layers3 size={14} /> Design</button><button className={panel === "code" ? "selected" : ""} onClick={() => setPanel("code")}><Code2 size={14} /> JSON</button></div>
            {panel === "design" ? (
              <div className="design-panel">
                {website.sections.length > 0 ? <>
                  <div className="section-list">
                    {website.sections.map((section, index) => (
                      <div className={`section-row ${selectedId === section.id ? "section-selected" : ""} ${draggingId === section.id ? "dragging" : ""}`} key={section.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, section.id)}>
                        <button className="drag-handle" draggable onDragStart={(event) => { setDraggingId(section.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); }} onDragEnd={() => setDraggingId("")} aria-label={`Drag ${section.type} section`} title="Drag to reorder"><span>⠿</span></button>
                        <button className="section-select" onClick={() => setSelectedId(section.id)}><span className="section-num">{String(index + 1).padStart(2, "0")}</span><span className="section-label">{section.type}</span><span className="section-title">{section.heading || "Untitled section"}</span></button>
                        <div className="section-actions"><button onClick={() => moveSection(section.id, -1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={13} /></button><button onClick={() => moveSection(section.id, 1)} disabled={index === website.sections.length - 1} aria-label="Move down"><ArrowDown size={13} /></button><button onClick={() => deleteSection(section.id)} aria-label="Remove section"><Trash2 size={13} /></button></div>
                      </div>
                    ))}
                  </div>
                  {selectedSection && <div className="property-editor">
                    <div className="property-heading"><span>EDIT {selectedSection.type.toUpperCase()}</span><button onClick={() => setSelectedId("")} aria-label="Close editor"><X size={14} /></button></div>
                    <label>Heading<input value={selectedSection.heading} onChange={(event) => updateSection(selectedSection.id, { heading: event.target.value })} maxLength={180} /></label>
                    <label>Subheading<input value={selectedSection.subheading} onChange={(event) => updateSection(selectedSection.id, { subheading: event.target.value })} maxLength={400} /></label>
                    <label>Body<textarea value={selectedSection.body} onChange={(event) => updateSection(selectedSection.id, { body: event.target.value })} maxLength={1200} /></label>
                    <label>Items <span className="muted-caption">(one per line)</span><textarea value={selectedSection.items.join("\n")} onChange={(event) => updateSection(selectedSection.id, { items: event.target.value.split("\n").slice(0, 8) })} /></label>
                    {(selectedSection.cards || []).map((card, index) => (
                      <div className="card-property-editor" key={`${selectedSection.id}-card-${index}`}>
                        <span className="muted-caption">CARD {String(index + 1).padStart(2, "0")}</span>
                        <label>Name<input value={card.title} onChange={(event) => updateSection(selectedSection.id, { cards: updateCard(selectedSection, index, { title: event.target.value }) })} maxLength={120} /></label>
                        <label>Details<input value={card.description} onChange={(event) => updateSection(selectedSection.id, { cards: updateCard(selectedSection, index, { description: event.target.value }) })} maxLength={300} /></label>
                        <label>Price / label<input value={card.price} onChange={(event) => updateSection(selectedSection.id, { cards: updateCard(selectedSection, index, { price: event.target.value }) })} maxLength={40} /></label>
                      </div>
                    ))}
                    <button className="add-content-card" onClick={() => addContentCard(selectedSection)}><Plus size={12} /> Add content card</button>
                  </div>}
                </> : <div className="empty-sections"><FilePlus2 size={20} /><strong>Your sections will live here</strong><span>Generate a website to start editing its content.</span></div>}
                <div className="theme-controls"><div className="theme-title"><span>YOUR PALETTE</span><div className="theme-actions"><button onClick={() => void handlePalette()} disabled={generatingPalette} title="Generate an AI color palette"><Sparkles size={13} /> {generatingPalette ? "Creating..." : "AI palette"}</button><button onClick={toggleDarkPreview} title="Toggle preview light / dark"><Moon size={14} /> {darkPreview ? "Light preview" : "Dark preview"}</button></div></div><div className="color-controls">{(["primary", "background", "text"] as const).map((key) => <label key={key}><input type="color" value={website.theme[key]} onChange={(event) => updateTheme(key, event.target.value)} /><span>{key}</span></label>)}</div></div>
                <div className="add-section"><span><Plus size={14} /> ADD A SECTION</span><div className="add-buttons">{sectionOptions.filter((option) => option.type !== "footer" || !website.sections.some((section) => section.type === "footer")).map((option) => <button key={option.type} onClick={() => addSection(option.type)}><Plus size={12} />{option.label}</button>)}</div></div>
              </div>
            ) : (
              <div className="code-panel"><div className="json-status"><span>{jsonError ? <><X size={13} /> Invalid JSON</> : <><Check size={13} /> Valid JSON</>}</span><button onClick={() => { setJsonDraft(jsonValue); setJsonError(""); }}><RotateCcw size={13} /> Reset</button></div><Suspense fallback={<div className="editor-loading">Preparing the code editor…</div>}><JsonEditor value={jsonDraft} onChange={updateJson} /></Suspense><p className="json-hint">{jsonError || "Edit the schema directly. Changes update your preview as you type."}</p></div>
            )}
          </section>

          <section className="preview-pane">
            <div className="preview-toolbar"><div className="preview-title"><Eye size={15} /><span>Live preview</span><span className="preview-live-dot" /></div><div className="preview-controls"><div className="device-switch"><button className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")} title="Desktop preview"><Monitor size={15} /></button><button className={mode === "tablet" ? "active" : ""} onClick={() => setMode("tablet")} title="Tablet preview"><Tablet size={15} /></button><button className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")} title="Mobile preview"><Smartphone size={15} /></button></div>{website.sections.length > 0 && <ProjectExport website={website} />}</div></div>
            <div className="preview-stage">
              {website.sections.length ? <WebsitePreview website={website} mode={mode} /> : <div className="preview-empty"><div className="empty-visual"><div className="empty-orbit orbit-a" /><div className="empty-orbit orbit-b" /><span><Sparkles size={22} /></span></div><span className="eyebrow">A BLANK CANVAS, FULL OF POSSIBILITY</span><h2>Your next idea<br />looks good already.</h2><p>Describe a website on the left and watch it take shape here.</p><button onClick={() => setPrompt(examples[0])}>Explore an example <ArrowRight size={14} /></button></div>}
            </div>
            <div className="preview-foot"><span><span className="secure-dot" /> Private preview</span><span>Made thoughtfully with <b>✳</b> Canvas AI</span></div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <Routes><Route path="/" element={<ProtectedStudio />} /><Route path="/login" element={<AuthPage initialMode="login" />} /><Route path="/signup" element={<AuthPage initialMode="signup" />} /><Route path="/reset-password" element={<AuthPage initialMode="reset-password" />} /><Route path="/auth/:mode" element={<AuthPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}

function ProtectedStudio() {
  const { configured, loading, recoveryMode, user } = useAuth();
  if (recoveryMode) return <Navigate to="/reset-password" replace />;
  if (import.meta.env.PROD && !configured) {
    return <main className="auth-page"><section className="auth-card"><div className="auth-mark"><Sparkles size={19} /></div><span className="eyebrow">DEPLOYMENT SETUP</span><h1>Workspace setup required.</h1><p>This production build is missing its public Supabase authentication settings. Rebuild the frontend with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY configured.</p></section></main>;
  }
  if (configured && loading) return <main className="auth-page" aria-live="polite">Loading your secure workspace…</main>;
  if (configured && !user) return <Navigate to="/login" replace />;
  if (configured && user && typeof user.user_metadata.phone_number === "string" && user.user_metadata.phone_number !== user.phone) {
    return <Navigate to="/login?verifyPhone=1" replace />;
  }
  return <Studio />;
}
