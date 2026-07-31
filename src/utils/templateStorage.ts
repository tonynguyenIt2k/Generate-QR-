import { LabelTemplate } from '../types/label';
import { DEFAULT_TEMPLATES } from './defaultTemplates';

const STORAGE_KEY = 'qr_label_pro_templates';

export function getAllTemplates(): LabelTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAllTemplates(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    const parsed: LabelTemplate[] = JSON.parse(raw);
    if (!parsed || !parsed.length) {
      saveAllTemplates(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }

    // Merge or update default templates
    let modified = false;
    DEFAULT_TEMPLATES.forEach((def) => {
      const idx = parsed.findIndex((t) => t.id === def.id);
      if (idx === -1) {
        parsed.unshift(def);
        modified = true;
      } else {
        // Keep updated default elements & dimensions
        parsed[idx] = {
          ...def,
          // Preserve user updatedAt if custom, but use new elements
          elements: def.elements,
        };
        modified = true;
      }
    });

    if (modified) {
      saveAllTemplates(parsed);
    }

    return parsed;
  } catch (e) {
    console.error('Error reading templates from localStorage', e);
    return DEFAULT_TEMPLATES;
  }
}

export function saveAllTemplates(templates: LabelTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving templates to localStorage', e);
  }
}

export function saveTemplate(template: LabelTemplate): LabelTemplate[] {
  const all = getAllTemplates();
  const existingIdx = all.findIndex((t) => t.id === template.id);

  const updatedTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = updatedTemplate;
  } else {
    all.push(updatedTemplate);
  }

  saveAllTemplates(all);
  return all;
}

export function deleteTemplate(templateId: string): LabelTemplate[] {
  const all = getAllTemplates();
  const filtered = all.filter((t) => t.id !== templateId);
  saveAllTemplates(filtered);
  return filtered;
}

export function exportTemplateToJson(template: LabelTemplate): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `template_${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importTemplateFromJson(file: File): Promise<LabelTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as LabelTemplate;
        if (!parsed || !parsed.name || !Array.isArray(parsed.elements)) {
          throw new Error('File JSON không đúng cấu trúc Mẫu Tem Nhãn.');
        }
        // ensure unique ID
        parsed.id = 'imported_' + Date.now();
        parsed.updatedAt = new Date().toISOString();
        saveTemplate(parsed);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
