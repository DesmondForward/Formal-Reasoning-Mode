import { DOMAIN_OPTIONS, type DomainOption } from './schema'

export interface DomainChoice {
  value: DomainOption
  label: string
  description: string
}

export const DOMAIN_DESCRIPTION_MAP: Record<DomainOption, string> = {
  artificial_intelligence: 'AI/ML models, neural networks, and intelligent systems',
  astrobiology: 'Life\'s origin, evolution, and distribution in the universe, including prebiotic chemistry and exoplanet biosignatures',
  astrophysics: 'Celestial mechanics, stellar dynamics, and cosmic phenomena',
  autonomous_systems: 'Robotics, autonomous vehicles, and self-governing systems',
  biology: 'Biological systems and processes',
  blockchain_systems: 'Cryptoeconomics, decentralized consensus, tokenomics, and blockchain protocol design',
  chemical_engineering: 'Process design, reactor engineering, and chemical systems',
  chemistry: 'Chemical reactions, kinetics, and thermodynamics',
  climate_geoengineering: 'Deliberate large-scale climate interventions, including solar radiation management and carbon removal strategies',
  climate_science: 'Climate modeling, carbon dynamics, and environmental systems',
  cognitive_science: 'Computational models of human cognition, decision-making, memory, and NeuroAI approaches',
  coding: 'Software engineering, algorithms, and toolchain automation',
  complex_systems: 'Emergent phenomena, self-organization, chaos theory, and multi-agent systems across domains',
  computational_finance: 'Financial modeling, risk analysis, and algorithmic trading',
  cybersecurity: 'Security protocols, cryptography, and threat modeling',
  data_science: 'Big data, statistical modeling, and predictive analytics',
  economics: 'Economic models, markets, and policy simulations',
  energy_systems: 'Power generation, distribution, and energy optimization',
  engineering: 'Engineering systems, design, and optimization',
  fluid_dynamics: 'Fluid flow, turbulence, and hydrodynamic systems',
  fluid_mechanics: 'Fluid behavior, flow analysis, and mechanical systems',
  general: 'General mathematical or cross-domain problems',
  geosciences: 'Earth sciences, geology, and geophysical processes',
  materials_science: 'Advanced materials, nanotechnology, and material properties',
  mathematics: 'Pure and applied mathematical reasoning and analysis',
  medicine: 'Medical and healthcare problems',
  metrology: 'Measurement science, calibration, and standards',
  neuroscience: 'Neural systems, brain function, and cognitive modeling',
  network_science: 'Complex networks, graph theory, and connectivity analysis',
  physics: 'Physical systems, mechanics, and fundamental interactions',
  public_health: 'Population health, epidemiology, and policy modeling',
  quantum_biology: 'Quantum effects in living systems, including photosynthesis efficiency, enzyme tunneling, and magnetoreception',
  quantum_computing: 'Quantum algorithms, hardware, and quantum information',
  renewable_energy: 'Solar, wind, and sustainable energy systems',
  robotics: 'Robot control, motion planning, and embodied intelligence',
  signal_processing: 'Signal analysis, filtering, and communication systems',
  social_science: 'Human behavior, societal dynamics, and policy analysis',
  space_technology: 'Space exploration, satellite systems, and aerospace engineering',
  synthetic_biology: 'Engineered biological systems and synthetic organisms',
  systems_biology: 'Biological networks, metabolic pathways, and cellular systems',
  unconventional_computing: 'Biological and molecular computing paradigms, including DNA computing and cellular computing',
}

export const formatDomainLabel = (value: DomainOption): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const DOMAIN_CHOICES: DomainChoice[] = DOMAIN_OPTIONS.map((value) => ({
  value,
  label: formatDomainLabel(value),
  description: DOMAIN_DESCRIPTION_MAP[value],
}))
