export type SkillId =
  | 'planner'
  | 'data-wizard'
  | 'diagram-builder'
  | 'web-researcher'
  | 'document-generator'

export const SKILLS: {
  id: SkillId
  icon: string
  label: string
  hint: string
  /** Filename (without .md) injected as `use @{file}` prefix in the prompt */
  file: string
}[] = [
  { id: 'planner',            icon: '◆', label: 'Planner',         hint: 'Strategic reasoning & multi-step planning', file: 'auto_planning'       },
  { id: 'data-wizard',        icon: '∑', label: 'Data Wizard',     hint: 'Data extraction, parsing & analysis',       file: 'data_wizard'         },
  { id: 'diagram-builder',    icon: '⊞', label: 'Diagram Builder', hint: 'Charts, flowcharts & visualizations',       file: 'diagram_builder'     },
  { id: 'web-researcher',     icon: '◎', label: 'Web Researcher',  hint: 'Web scraping, browsing & research',         file: 'web_research'        },
  { id: 'document-generator', icon: '≡', label: 'Doc Generator',   hint: 'Reports, docs & structured output',        file: 'document_generator'  },
]

export const SKILL_BY_ID = Object.fromEntries(
  SKILLS.map(s => [s.id, s])
) as Record<SkillId, typeof SKILLS[number]>
