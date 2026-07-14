export type Discipline = 'all' | 'electrical' | 'controls' | 'reliability'

export type Service = {
  id: string
  title: string
  discipline: Exclude<Discipline, 'all'>
  summary: string
  description: string
  deliverables: string[]
  responseNote: string
  image: string | null
  imageAlt: string
}

export const content = {
  brand: 'GRIDLINE',
  descriptor: 'Field Services',
  nav: [
    { label: 'Services', href: '#services' },
    { label: 'Approach', href: '#approach' },
  ],
  hero: {
    eyebrow: 'Industrial electrical + automation — Victoria',
    title: 'Keep critical sites moving.',
    body: 'Gridline plans, troubleshoots and delivers electrical and controls work for industrial teams that cannot afford vague scopes or messy handovers.',
    primaryAction: 'Request a scope review',
    secondaryAction: 'Explore service coverage',
    availability: 'Planned works and response support across Victoria',
  },
  servicesIntro: {
    eyebrow: 'Service coverage / 01',
    title: 'Start with the problem on site.',
    body: 'Filter by discipline, then inspect the work package that best matches the constraint your team is carrying.',
  },
  filters: [
    { value: 'all' as const, label: 'All' },
    { value: 'electrical' as const, label: 'Electrical' },
    { value: 'controls' as const, label: 'Controls' },
    { value: 'reliability' as const, label: 'Reliability' },
  ],
  services: [
    {
      id: 'shutdown-commissioning',
      title: 'Shutdowns + commissioning',
      discipline: 'electrical',
      summary: 'Sequenced site works with testing, energisation and handover planned as one job.',
      description: 'Gridline turns shutdown constraints into a practical workfront: isolations, access, hold points, commissioning records and the handover your operations team needs to restart with confidence.',
      deliverables: ['Workfront and isolation plan', 'Test and commissioning records', 'Marked-up handover pack'],
      responseNote: 'Best scoped before the outage window is locked.',
      image: '/assets/shutdown.svg',
      imageAlt: 'Technician reviewing an industrial shutdown workfront',
    },
    {
      id: 'switchboard-modernisation',
      title: 'Switchboard modernisation, protection coordination + thermal risk review',
      discipline: 'electrical',
      summary: 'A staged path from ageing distribution equipment to safer, maintainable plant.',
      description: 'We review condition, loading, protection and operational constraints before defining a staged board upgrade that can actually be delivered around production.',
      deliverables: ['Condition and constraint review', 'Protection and staging basis', 'Construction-ready scope boundaries'],
      responseNote: 'Useful when a replacement project is known but not yet cleanly defined.',
      image: '/assets/switchboard.svg',
      imageAlt: 'Industrial switchboard inspection points',
    },
    {
      id: 'plc-fault-finding',
      title: 'PLC + controls fault-finding',
      discipline: 'controls',
      summary: 'Structured diagnosis across field signals, logic, networks and operator interfaces.',
      description: 'Gridline traces the fault across the control chain, documents what was found and separates the immediate recovery action from the reliability work that should follow.',
      deliverables: ['Fault chronology and evidence', 'Recovery actions', 'Follow-up reliability recommendations'],
      responseNote: 'Bring recent alarms, changes and the last known good operating state.',
      image: '/assets/controls.svg',
      imageAlt: 'Controls cabinet signal and network checks',
    },
    {
      id: 'controls-migration',
      title: 'Controls migration planning',
      discipline: 'controls',
      summary: 'Define interfaces, cutover logic and proof before legacy hardware becomes the outage.',
      description: 'We map the installed system, its undocumented dependencies and the operating windows available, then shape a migration plan with testable cutover and rollback points.',
      deliverables: ['Installed-system map', 'Migration and interface scope', 'Cutover, test and rollback plan'],
      responseNote: 'Start while the existing system is still observable and supported.',
      image: '/assets/migration.svg',
      imageAlt: 'Legacy controls migration interface map',
    },
    {
      id: 'preventive-maintenance',
      title: 'Preventive maintenance systems',
      discipline: 'reliability',
      summary: 'Maintenance routines built around failure consequence, evidence and site capacity.',
      description: 'Gridline converts asset knowledge and recurring defects into a maintainable program: clear tasks, sensible intervals, escalation triggers and records that support the next decision.',
      deliverables: ['Criticality and task review', 'Maintainable inspection routines', 'Defect and escalation workflow'],
      responseNote: 'A strong fit when PM volume is high but confidence in its value is low.',
      image: '/assets/maintenance.svg',
      imageAlt: 'Field maintenance inspection record and equipment',
    },
    {
      id: 'power-quality',
      title: 'Power-quality investigations',
      discipline: 'reliability',
      summary: 'Evidence-led investigation of nuisance trips, voltage events and unexplained equipment stress.',
      description: 'We establish the operating pattern, capture the right electrical evidence and connect events to plant behaviour so the response is based on a cause rather than a hunch.',
      deliverables: ['Measurement plan and event capture', 'Operational correlation', 'Findings and prioritized actions'],
      responseNote: 'The missing-media state for this service is intentional.',
      image: null,
      imageAlt: 'No field image supplied for power-quality investigations',
    },
  ] satisfies Service[],
  approach: {
    eyebrow: 'Working method / 02',
    title: 'A clean line from constraint to handover.',
    principles: [
      { number: '01', title: 'Find the operating constraint', body: 'Start with the site, access, production and evidence—not a pre-filled solution.' },
      { number: '02', title: 'Make interfaces explicit', body: 'Name boundaries, owners, hold points and what must be true before work proceeds.' },
      { number: '03', title: 'Leave useful records', body: 'Hand over information the next technician and the asset owner can actually use.' },
    ],
  },
  close: {
    eyebrow: 'Next workfront',
    title: 'Bring us the constraint before it becomes the outage.',
    body: 'Share the site, system and timing. Gridline will respond with the information needed to shape a useful first scope review.',
  },
  form: {
    title: 'Request a scope review',
    intro: 'Tell us enough to understand the workfront. This prototype does not send data.',
    projectTypes: ['Planned upgrade', 'Fault or recurring trip', 'Shutdown work', 'Maintenance system', 'Other'],
    submit: 'Submit request',
    success: 'Thanks — a scope engineer will reply within one business day.',
  },
  footer: {
    line: 'Industrial electrical + automation field services',
    region: 'Victoria, Australia',
    note: 'Round 0 benchmark prototype — no form data is transmitted.',
  },
} as const
