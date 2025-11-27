// Fake hosts for demo events - 1 per city
export interface FakeHost {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  profileImageUrl: string;
  isDemo: boolean;
  city: string;
}

// One demo host per launch city
export const FAKE_HOSTS = [
  {
    id: 'fake-host-vancouver',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-vancouver@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-vancouver/150/150',
    isDemo: true,
    city: 'Vancouver',
  },
  {
    id: 'fake-host-toronto',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-toronto@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-toronto/150/150',
    isDemo: true,
    city: 'Toronto',
  },
  {
    id: 'fake-host-montreal',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-montreal@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-montreal/150/150',
    isDemo: true,
    city: 'Montreal',
  },
  {
    id: 'fake-host-ottawa',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-ottawa@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-ottawa/150/150',
    isDemo: true,
    city: 'Ottawa',
  },
  {
    id: 'fake-host-quebec',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-quebec@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-quebec/150/150',
    isDemo: true,
    city: 'Quebec',
  },
  {
    id: 'fake-host-gatineau',
    name: 'Alex Rivera – Demo Host',
    username: 'alexriverademo',
    email: 'demo-host-gatineau@popera.app',
    bio: 'This is a demo account used to showcase how Popera events work.',
    profileImageUrl: 'https://picsum.photos/seed/demo-host-gatineau/150/150',
    isDemo: true,
    city: 'Gatineau',
  },
];
