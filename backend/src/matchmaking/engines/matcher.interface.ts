export interface Matcher {
  findMatch(userId: string, criteria?: any): Promise<any>;
}
