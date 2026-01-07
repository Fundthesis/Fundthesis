export interface NavItem {
  name: string;
  href: string;
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Discover', href: '/discover' },
  { name: 'Insights', href: '/insights' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'LearnThesis', href: '/learn' },
  { name: 'EnviroThesis', href: '/enviro' },
];
