// Fake hosts for demo events - 2 per city
export interface FakeHost {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  profileImageUrl: string;
  isDemo: boolean;
  city: string;
  useCase: string; // e.g., 'musician', 'fitness-coach', 'art-workshop', 'small-business', 'community-organizer'
}

// Cities: Vancouver, Toronto, Montreal, Calgary, Ottawa
export const FAKE_HOSTS: FakeHost[] = [
  // Vancouver - Host 1: Musician
  {
    id: 'fake-host-vancouver-1',
    name: 'Alex Chen',
    username: 'alexchenmusic',
    email: 'alex.chen@example.com',
    bio: 'Jazz musician and event curator. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=33',
    isDemo: true,
    city: 'Vancouver',
    useCase: 'musician',
  },
  // Vancouver - Host 2: Fitness Coach
  {
    id: 'fake-host-vancouver-2',
    name: 'Sarah Martinez',
    username: 'sarahfitness',
    email: 'sarah.martinez@example.com',
    bio: 'Certified yoga and fitness instructor. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=45',
    isDemo: true,
    city: 'Vancouver',
    useCase: 'fitness-coach',
  },
  // Toronto - Host 1: Art Workshop Host
  {
    id: 'fake-host-toronto-1',
    name: 'Emma Rodriguez',
    username: 'emmaartworkshop',
    email: 'emma.rodriguez@example.com',
    bio: 'Art instructor and creative workshop facilitator. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=20',
    isDemo: true,
    city: 'Toronto',
    useCase: 'art-workshop',
  },
  // Toronto - Host 2: Small Business Owner
  {
    id: 'fake-host-toronto-2',
    name: 'David Kim',
    username: 'davidkimmarket',
    email: 'david.kim@example.com',
    bio: 'Local artisan and small business owner. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=12',
    isDemo: true,
    city: 'Toronto',
    useCase: 'small-business',
  },
  // Montreal - Host 1: Community Organizer
  {
    id: 'fake-host-montreal-1',
    name: 'Marie Dubois',
    username: 'mariedubois',
    email: 'marie.dubois@example.com',
    bio: 'Community organizer and social event coordinator. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=47',
    isDemo: true,
    city: 'Montreal',
    useCase: 'community-organizer',
  },
  // Montreal - Host 2: Musician
  {
    id: 'fake-host-montreal-2',
    name: 'Jean-Pierre Lavoie',
    username: 'jplavoie',
    email: 'jeanpierre.lavoie@example.com',
    bio: 'Indie musician and live performance host. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=32',
    isDemo: true,
    city: 'Montreal',
    useCase: 'musician',
  },
  // Calgary - Host 1: Fitness Coach
  {
    id: 'fake-host-calgary-1',
    name: 'Mike Thompson',
    username: 'mikethompsonfit',
    email: 'mike.thompson@example.com',
    bio: 'CrossFit coach and wellness advocate. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=15',
    isDemo: true,
    city: 'Calgary',
    useCase: 'fitness-coach',
  },
  // Calgary - Host 2: Small Business Owner
  {
    id: 'fake-host-calgary-2',
    name: 'Lisa Wang',
    username: 'lisawangcrafts',
    email: 'lisa.wang@example.com',
    bio: 'Handmade crafts vendor and market organizer. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=28',
    isDemo: true,
    city: 'Calgary',
    useCase: 'small-business',
  },
  // Ottawa - Host 1: Art Workshop Host
  {
    id: 'fake-host-ottawa-1',
    name: 'James Wilson',
    username: 'jameswilsonart',
    email: 'james.wilson@example.com',
    bio: 'Pottery instructor and creative arts facilitator. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=22',
    isDemo: true,
    city: 'Ottawa',
    useCase: 'art-workshop',
  },
  // Ottawa - Host 2: Community Organizer
  {
    id: 'fake-host-ottawa-2',
    name: 'Sophie Anderson',
    username: 'sophieanderson',
    email: 'sophie.anderson@example.com',
    bio: 'Neighborhood coordinator and social gathering host. This is a sample host used to demonstrate what\'s possible on Popera.',
    profileImageUrl: 'https://i.pravatar.cc/150?img=38',
    isDemo: true,
    city: 'Ottawa',
    useCase: 'community-organizer',
  },
];
