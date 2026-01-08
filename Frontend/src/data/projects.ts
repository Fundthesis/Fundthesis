export interface Project {
  title: string;
  description: string;
  technologies?: string[];
  link?: string;
  github?: string;
}

export const projects: Project[] = [
  {
    title: 'FundThesis',
    description: 'AI-Powered Financial Education Platform',
    technologies: ['Next.js', 'TypeScript', 'FastAPI', 'Azure OpenAI'],
    link: '/',
  },
  // Add more projects as needed
];

