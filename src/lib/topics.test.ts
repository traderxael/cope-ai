import { describe, expect, it } from 'vitest';
import { AREAS, TOPICS, type TopicArea } from './topics';

describe('catálogo de temas', () => {
  it('tiene ocho temas en tres áreas', () => {
    expect(TOPICS).toHaveLength(8);
    expect(AREAS).toHaveLength(3);
    expect(new Set(TOPICS.map((topic) => topic.id)).size).toBe(8);
    for (const area of AREAS) {
      expect(TOPICS.some((topic) => topic.area === area.id)).toBe(true);
    }
  });

  it('cada tema tiene explicación, ejemplo y fuente verificable', () => {
    for (const topic of TOPICS) {
      expect(topic.what.length).toBeGreaterThan(40);
      expect(topic.how.length).toBeGreaterThan(40);
      expect(topic.example.length).toBeGreaterThan(20);
      expect(topic.source.url).toMatch(/^https:\/\/es\.wikipedia\.org\/wiki\//);
      expect(topic.source.label).toBeTruthy();
      expect(topic.model).toMatch(/^\/models\/.+\.glb$/);
    }
  });

  it('usa áreas válidas', () => {
    const ids: TopicArea[] = AREAS.map((area) => area.id);
    for (const topic of TOPICS) expect(ids).toContain(topic.area);
  });
});
