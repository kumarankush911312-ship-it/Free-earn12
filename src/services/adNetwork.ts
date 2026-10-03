export interface AdSponsor {
  id: string;
  brand: string;
  tagline: string;
  description: string;
  category: string;
  actionText: string;
  actionUrl: string;
  accentColor: string;
  videoDurationSeconds: number;
}

export const SPONSOR_ADS: AdSponsor[] = [
  {
    id: 'ad_cloud_01',
    brand: 'Google Cloud Platform',
    tagline: 'Build apps faster with serverless tech',
    description: 'Deploy web apps, AI models, and scalable databases worldwide with free credits on sign up.',
    category: 'Technology & Cloud',
    actionText: 'Explore Cloud Free Tier',
    actionUrl: 'https://cloud.google.com',
    accentColor: '#4285F4',
    videoDurationSeconds: 15,
  },
  {
    id: 'ad_learn_02',
    brand: 'Khan Academy',
    tagline: 'Free world-class education for anyone, anywhere',
    description: 'Master math, science, programming, finance, and humanities at your own personalized pace.',
    category: 'Education',
    actionText: 'Start Learning Free',
    actionUrl: 'https://khanacademy.org',
    accentColor: '#14BF96',
    videoDurationSeconds: 15,
  },
  {
    id: 'ad_lang_03',
    brand: 'Duolingo',
    tagline: 'Learn 40+ languages with bite-sized lessons',
    description: 'Join over 500 million learners building real-world communication skills in Spanish, German, Japanese, and more.',
    category: 'Learning & Languages',
    actionText: 'Get The Free App',
    actionUrl: 'https://duolingo.com',
    accentColor: '#58CC02',
    videoDurationSeconds: 15,
  },
  {
    id: 'ad_code_04',
    brand: 'Flutter & Dart',
    tagline: 'Multi-platform apps from a single codebase',
    description: 'Build, test, and deploy beautiful mobile, desktop, and web applications natively with Google Flutter.',
    category: 'Developer Tools',
    actionText: 'View Flutter Showcase',
    actionUrl: 'https://flutter.dev',
    accentColor: '#02569B',
    videoDurationSeconds: 15,
  },
];

export interface AdRewardVerificationResult {
  verified: boolean;
  rewardCoins: number;
  adSessionId: string;
  sponsorBrand: string;
  timestamp: string;
  error?: string;
}

export class RewardedAdController {
  private static cooldownSec: number = 20;

  static getRandomSponsor(): AdSponsor {
    const idx = Math.floor(Math.random() * SPONSOR_ADS.length);
    return SPONSOR_ADS[idx];
  }

  static verifyAdCompletion(
    adSessionId: string,
    sponsor: AdSponsor,
    elapsedSeconds: number,
    rewardCoins: number
  ): AdRewardVerificationResult {
    // Anti-fraud checks
    if (!adSessionId || !adSessionId.startsWith('AD_SESS_')) {
      return {
        verified: false,
        rewardCoins: 0,
        adSessionId,
        sponsorBrand: sponsor.brand,
        timestamp: new Date().toISOString(),
        error: 'Invalid ad session token.',
      };
    }

    if (elapsedSeconds < sponsor.videoDurationSeconds) {
      return {
        verified: false,
        rewardCoins: 0,
        adSessionId,
        sponsorBrand: sponsor.brand,
        timestamp: new Date().toISOString(),
        error: 'Ad was closed prematurely before required completion.',
      };
    }

    return {
      verified: true,
      rewardCoins,
      adSessionId,
      sponsorBrand: sponsor.brand,
      timestamp: new Date().toISOString(),
    };
  }
}
