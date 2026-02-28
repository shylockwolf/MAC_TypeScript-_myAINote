export interface Tag {
  key: string;
  value: string;
}

export interface Note {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export type Category = 'IT技术' | '管理' | '财务' | '私人事务' | '其它';

export interface AIAnalysis {
  topic: string;
  people: string[];
  category: Category;
  summary: string;
}
