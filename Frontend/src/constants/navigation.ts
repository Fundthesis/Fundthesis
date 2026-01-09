export interface NavItem {
  name: string;
  href: string;
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Discover', href: '/discover' },
  { name: 'Insights', href: '/insights' },
  { name: 'Missions', href: '/missions' },
  { name: 'Debrief', href: '/debrief' },
  { name: 'Biography', href: '/biography' },
  { name: 'Mentor', href: '/mentor' },
  { name: 'LearnThesis', href: '/learn' },
  { name: 'EnviroThesis', href: '/enviro' },
];

