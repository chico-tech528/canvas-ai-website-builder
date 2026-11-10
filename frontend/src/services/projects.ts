import type { Project } from "../types";
import { isWebsiteSchema } from "../utils/websiteSchema";
import { api } from "./api";
import { isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "canvas-projects-v1";
const savesInFlight = new Map<string, Promise<Project[]>>();

export function loadProjects(): Project[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) throw new Error("Stored project history is not a list.");
    return stored.filter((item): item is Project =>
      !!item
      && typeof item.id === "string"
      && typeof item.prompt === "string"
      && typeof item.createdAt === "string"
      && isWebsiteSchema(item.website),
    );
  } catch (error) {
    console.error("Unable to read project history:", error);
    return [];
  }
}

function saveProjectsLocally(project: Project): Project[] {
  const projects = [project, ...loadProjects().filter((item) => item.id !== project.id)].slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
}

export async function fetchProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured) return loadProjects();
  const response = await api.get<{ projects: Project[] }>("/projects");
  return response.data.projects.filter((project) => isWebsiteSchema(project.website));
}

export async function saveProject(project: Project): Promise<Project[]> {
  if (!isSupabaseConfigured) return saveProjectsLocally(project);
  const previous = savesInFlight.get(project.id) || Promise.resolve([]);
  const current = previous.catch(() => []).then(async () => {
    await api.put(`/projects/${encodeURIComponent(project.id)}`, project);
    return fetchProjects();
  });
  savesInFlight.set(project.id, current);
  const clear = () => {
    if (savesInFlight.get(project.id) === current) savesInFlight.delete(project.id);
  };
  current.then(clear, clear);
  return current;
}

export async function waitForProjectSaves(): Promise<void> {
  await Promise.all(savesInFlight.values());
}
