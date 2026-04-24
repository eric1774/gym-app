import { greeting } from '../greeting';

describe('greeting', () => {
  it('returns "Good morning" before noon', () => {
    expect(greeting(new Date('2026-04-23T08:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-04-23T11:59:00'))).toBe('Good morning');
  });
  it('returns "Good afternoon" between noon and 5pm', () => {
    expect(greeting(new Date('2026-04-23T12:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-04-23T16:59:00'))).toBe('Good afternoon');
  });
  it('returns "Good evening" 5pm and later', () => {
    expect(greeting(new Date('2026-04-23T17:00:00'))).toBe('Good evening');
    expect(greeting(new Date('2026-04-23T23:59:00'))).toBe('Good evening');
  });
  it('composes the full greeting when a name is provided', () => {
    expect(greeting(new Date('2026-04-23T08:00:00'), 'Eric')).toBe('Good morning, Eric');
  });
  it('omits the name portion when name is null or empty', () => {
    expect(greeting(new Date('2026-04-23T08:00:00'), null)).toBe('Good morning');
    expect(greeting(new Date('2026-04-23T08:00:00'), '')).toBe('Good morning');
  });
});
