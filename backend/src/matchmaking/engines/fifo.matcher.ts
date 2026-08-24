import { Matcher } from './matcher.interface';

export class FifoMatcher implements Matcher {
  async findMatch(userId: string): Promise<any> {
    // FIFO implementation
    return null;
  }
}
