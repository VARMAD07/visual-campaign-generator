export type CampaignType = 'poster' | 'banner' | 'social_media' | 'event' | 'promo';

export interface Project {
  id: string;
  name: string;
  campaignType: CampaignType;
  brandDetails: string;
  visualStyle: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Asset {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface Variation {
  id: string;
  projectId: string;
  headline: string;
  description: string;
  imagePrompt: string;
  colors: string[];
  imageUrl?: string;
  createdAt: string;
}

export interface Suggestion {
  headline: string;
  description: string;
  imagePrompt: string;
  colors: string[];
}
