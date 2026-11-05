export interface NoteItem {
  id: string;
  title: string;
  hash: string;
  folderType: string;
  aliases: string[];
  category: string;
  subCategory: string;
  field: string;
  subField: string;
  type: string;
  subType: string;
  topic: string;
  topics: string[];
  ig: string;
  website: string;
  genres?: string[];
  labels?: string[];
  cities: string[];
  countries: string[];
  tldr: string;
  info: string;
  summary?: string;
  rawContent?: string;
  allProps?: Record<string, string | string[]>;
  unlisted?: boolean;
}

export interface TaxonomyCategory {
  count: number;
  subCategories: {
    [subCatName: string]: {
      count: number;
      topics: {
        [topicName: string]: number;
      };
    };
  };
}

export type TaxonomyData = {
  [categoryName: string]: TaxonomyCategory;
};
